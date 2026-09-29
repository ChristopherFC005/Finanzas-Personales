import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AccountsService } from "./accounts.service";
import { PrismaService } from "../common/prisma/prisma.service";

describe("AccountsService — credit line renewal", () => {
  let service: AccountsService;
  let prisma: {
    account: { findUnique: jest.Mock };
    accountPayment: { create: jest.Mock; groupBy: jest.Mock };
    transaction: { groupBy: jest.Mock };
    loan: { groupBy: jest.Mock };
  };

  const creditAccount = {
    id: "acc-1",
    userId: "u1",
    type: "CREDIT",
    initialBalance: "0",
    creditLimit: "3000",
  };

  beforeEach(() => {
    prisma = {
      account: { findUnique: jest.fn() },
      accountPayment: { create: jest.fn(), groupBy: jest.fn() },
      transaction: { groupBy: jest.fn() },
      loan: { groupBy: jest.fn() },
    };
    service = new AccountsService(prisma as unknown as PrismaService);
  });

  it("rejects payments on a non-credit account", async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: "acc-2",
      userId: "u1",
      type: "DEBIT",
    });

    await expect(
      service.payCreditCard("u1", "acc-2", { amount: "100", sourceAccountId: "src-1" } as never),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.accountPayment.create).not.toHaveBeenCalled();
  });

  it("a regular payment renews the credit line by the same amount", () => {
    // 500 already spent (currentBalance -500), then a 200 regular payment.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const withComputedBalance = (service as any).withComputedBalance.bind(service);

    const result = withComputedBalance(
      creditAccount,
      [{ accountId: "acc-1", type: "EXPENSE", _sum: { amount: 500 } }],
      [{ accountId: "acc-1", isInstallment: false, _sum: { amount: 200 } }],
    );

    expect(result.currentBalance).toBe(-300); // -500 + 200
    expect(result.availableCredit).toBe(2700); // 3000 + (-300) - 0
  });

  it("an installment payment reduces debt but does NOT renew the credit line", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const withComputedBalance = (service as any).withComputedBalance.bind(service);

    const result = withComputedBalance(
      creditAccount,
      [{ accountId: "acc-1", type: "EXPENSE", _sum: { amount: 500 } }],
      [{ accountId: "acc-1", isInstallment: true, _sum: { amount: 200 } }],
    );

    expect(result.currentBalance).toBe(-300); // debt visibly drops, same as a regular payment
    expect(result.availableCredit).toBe(2500); // 3000 + (-300) - 200 reserved — unchanged from before paying
  });

  it("mixing a regular and an installment payment only renews the regular portion", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const withComputedBalance = (service as any).withComputedBalance.bind(service);

    const result = withComputedBalance(
      creditAccount,
      [{ accountId: "acc-1", type: "EXPENSE", _sum: { amount: 500 } }],
      [
        { accountId: "acc-1", isInstallment: false, _sum: { amount: 100 } },
        { accountId: "acc-1", isInstallment: true, _sum: { amount: 100 } },
      ],
    );

    expect(result.currentBalance).toBe(-300); // -500 + 100 + 100
    expect(result.availableCredit).toBe(2600); // 3000 + (-300) - 100 reserved
  });
});

describe("AccountsService — loans funded from an account", () => {
  let service: AccountsService;

  const debitAccount = {
    id: "acc-1",
    userId: "u1",
    type: "DEBIT",
    initialBalance: "1000",
    creditLimit: null,
  };

  beforeEach(() => {
    service = new AccountsService({} as unknown as PrismaService);
  });

  it("subtracts an active loan's total amount from the funding account's balance", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const withComputedBalance = (service as any).withComputedBalance.bind(service);

    const result = withComputedBalance(
      debitAccount,
      [],
      [],
      [{ accountId: "acc-1", _sum: { totalAmount: 300 } }],
    );

    expect(result.currentBalance).toBe(700); // 1000 - 300 lent out
  });

  it("does not deduct a loan that was never linked to this account", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const withComputedBalance = (service as any).withComputedBalance.bind(service);

    const result = withComputedBalance(debitAccount, [], [], []);

    expect(result.currentBalance).toBe(1000);
  });

  it("credits a loan repayment back to the account that funded it", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const withComputedBalance = (service as any).withComputedBalance.bind(service);

    const result = withComputedBalance(
      debitAccount,
      [],
      [],
      [{ accountId: "acc-1", _sum: { totalAmount: 300 } }],
      [{ accountId: "acc-1", _sum: { amount: 120 } }],
    );

    expect(result.currentBalance).toBe(820); // 1000 - 300 lent + 120 repaid
  });

  it("subtracts a payment sent from this account to pay off another card", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const withComputedBalance = (service as any).withComputedBalance.bind(service);

    const result = withComputedBalance(
      debitAccount,
      [],
      [],
      [],
      [],
      [{ sourceAccountId: "acc-1", _sum: { amount: 250 } }],
    );

    expect(result.currentBalance).toBe(750); // 1000 - 250 sent to pay another card
  });
});

describe("AccountsService — credit card payments (source account + statement cap)", () => {
  let service: AccountsService;
  let prisma: {
    account: { findUnique: jest.Mock };
    accountPayment: {
      create: jest.Mock;
      groupBy: jest.Mock;
      aggregate: jest.Mock;
    };
    transaction: { groupBy: jest.Mock; aggregate: jest.Mock };
    loan: { groupBy: jest.Mock; aggregate: jest.Mock };
    loanPayment: { groupBy: jest.Mock; aggregate: jest.Mock };
  };

  const cardNoBillingDate = {
    id: "card-1",
    userId: "u1",
    type: "CREDIT",
    initialBalance: "0",
    creditLimit: "3000",
    billingDate: null,
    createdAt: new Date(),
  };

  const debitSource = { id: "src-1", userId: "u1", type: "DEBIT" };

  beforeEach(() => {
    prisma = {
      account: { findUnique: jest.fn() },
      accountPayment: {
        create: jest.fn().mockResolvedValue({}),
        groupBy: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      },
      transaction: {
        groupBy: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      },
      loan: {
        groupBy: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn().mockResolvedValue({ _sum: { totalAmount: 0 } }),
      },
      loanPayment: {
        groupBy: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      },
    };
    service = new AccountsService(prisma as unknown as PrismaService);
  });

  it("rejects paying a card using itself as the source account", async () => {
    prisma.account.findUnique.mockResolvedValue(cardNoBillingDate);

    await expect(
      service.payCreditCard("u1", "card-1", { amount: "100", sourceAccountId: "card-1" } as never),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.accountPayment.create).not.toHaveBeenCalled();
  });

  it("rejects a source account that isn't owned by the user", async () => {
    prisma.account.findUnique.mockImplementation((args: { where: { id: string } }) =>
      Promise.resolve(
        args.where.id === "card-1" ? cardNoBillingDate : { id: "src-1", userId: "user-b", type: "DEBIT" },
      ),
    );

    await expect(
      service.payCreditCard("u1", "card-1", { amount: "100", sourceAccountId: "src-1" } as never),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.accountPayment.create).not.toHaveBeenCalled();
  });

  it("allows any payment amount when no billing date is set", async () => {
    prisma.account.findUnique.mockImplementation((args: { where: { id: string } }) =>
      Promise.resolve(args.where.id === "card-1" ? cardNoBillingDate : debitSource),
    );

    await service.payCreditCard("u1", "card-1", { amount: "9999", sourceAccountId: "src-1" } as never);

    expect(prisma.accountPayment.create).toHaveBeenCalledWith({
      data: { accountId: "card-1", sourceAccountId: "src-1", userId: "u1", amount: "9999", isInstallment: false },
    });
  });

  it("rejects a payment larger than the debt as of the last billing cutoff", async () => {
    const cardWithBilling = { ...cardNoBillingDate, billingDate: new Date("2026-09-10T00:00:00.000Z") };
    prisma.account.findUnique.mockImplementation((args: { where: { id: string } }) =>
      Promise.resolve(args.where.id === "card-1" ? cardWithBilling : debitSource),
    );
    // 200 charged before the cutoff -> statement debt is 200.
    prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 200 } });

    await expect(
      service.payCreditCard("u1", "card-1", { amount: "250", sourceAccountId: "src-1" } as never),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.accountPayment.create).not.toHaveBeenCalled();
  });

  it("allows a payment up to (but not over) the statement debt", async () => {
    const cardWithBilling = { ...cardNoBillingDate, billingDate: new Date("2026-09-10T00:00:00.000Z") };
    prisma.account.findUnique.mockImplementation((args: { where: { id: string } }) =>
      Promise.resolve(args.where.id === "card-1" ? cardWithBilling : debitSource),
    );
    prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 200 } });

    await service.payCreditCard("u1", "card-1", { amount: "200", sourceAccountId: "src-1" } as never);

    expect(prisma.accountPayment.create).toHaveBeenCalledWith({
      data: { accountId: "card-1", sourceAccountId: "src-1", userId: "u1", amount: "200", isInstallment: false },
    });
  });

  it("clears the statement due once it's been paid, even with newer unbilled charges on the card", async () => {
    // Regression test: a payment's paidAt is "now" (after the cutoff, since
    // people pay after seeing the statement), so a naive `paidAt <= cutoff`
    // filter would never see it and statementDue would stay stuck forever.
    const cardWithBilling = { ...cardNoBillingDate, billingDate: new Date("2026-09-10T00:00:00.000Z") };
    prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 300 } }); // 300 charged before the cutoff
    prisma.accountPayment.aggregate.mockImplementation((args: { where: { paidAt?: { gt?: Date } } }) =>
      Promise.resolve({ _sum: { amount: args.where.paidAt?.gt ? 300 : 0 } }),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getStatementDebt = (service as any).getStatementDebt.bind(service);
    const due = await getStatementDebt("u1", cardWithBilling);

    expect(due).toBe(0);
  });
});

describe("AccountsService — credit card billing/payment dates", () => {
  let service: AccountsService;
  let prisma: {
    account: { findUnique: jest.Mock; update: jest.Mock };
    transaction: { groupBy: jest.Mock };
    accountPayment: { groupBy: jest.Mock };
    loan: { groupBy: jest.Mock };
    loanPayment: { groupBy: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      account: { findUnique: jest.fn(), update: jest.fn() },
      transaction: { groupBy: jest.fn().mockResolvedValue([]) },
      accountPayment: { groupBy: jest.fn().mockResolvedValue([]) },
      loan: { groupBy: jest.fn().mockResolvedValue([]) },
      loanPayment: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    service = new AccountsService(prisma as unknown as PrismaService);
  });

  it("rejects setting billingDate on a non-credit account", async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: "acc-1",
      userId: "u1",
      type: "DEBIT",
      createdAt: new Date(),
    });

    await expect(
      service.update("u1", "acc-1", { billingDate: "2026-01-15" } as never),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.account.update).not.toHaveBeenCalled();
  });

  it("rejects changing paymentDueDate more than 3 days after creation", async () => {
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    prisma.account.findUnique.mockResolvedValue({
      id: "acc-1",
      userId: "u1",
      type: "CREDIT",
      createdAt: fourDaysAgo,
    });

    await expect(
      service.update("u1", "acc-1", { paymentDueDate: "2026-01-20" } as never),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.account.update).not.toHaveBeenCalled();
  });

  it("allows setting both dates within 3 days of creation on a credit account", async () => {
    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    prisma.account.findUnique.mockResolvedValue({
      id: "acc-1",
      userId: "u1",
      type: "CREDIT",
      createdAt: oneDayAgo,
    });
    prisma.account.update.mockResolvedValue({});

    await service.update("u1", "acc-1", {
      billingDate: "2026-01-15",
      paymentDueDate: "2026-01-25",
    } as never);

    expect(prisma.account.update).toHaveBeenCalled();
  });
});

describe("AccountsService — external loans excluded from balance", () => {
  let service: AccountsService;
  let prisma: {
    account: { findUnique: jest.Mock };
    accountPayment: { groupBy: jest.Mock };
    transaction: { groupBy: jest.Mock };
    loan: { groupBy: jest.Mock; findMany: jest.Mock };
    loanPayment: { groupBy: jest.Mock };
  };

  const debitAccount = {
    id: "acc-1",
    userId: "u1",
    type: "DEBIT",
    initialBalance: "1000",
    creditLimit: null,
    billingDate: null,
  };

  beforeEach(() => {
    prisma = {
      account: { findUnique: jest.fn().mockResolvedValue(debitAccount) },
      accountPayment: { groupBy: jest.fn().mockResolvedValue([]) },
      transaction: { groupBy: jest.fn().mockResolvedValue([]) },
      loan: { groupBy: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      loanPayment: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    service = new AccountsService(prisma as unknown as PrismaService);
  });

  it("queries loan.groupBy with isExternal: false so an already-lent loan never counts against the balance", async () => {
    // Simulates the DB filter actually excluding the external loan —
    // proves the query itself asks for isExternal: false, not just that
    // withComputedBalance would ignore it if it were passed in.
    prisma.loan.groupBy.mockImplementation((args: { where: { isExternal?: boolean } }) =>
      Promise.resolve(args.where.isExternal === false ? [] : [{ accountId: "acc-1", _sum: { totalAmount: 500 } }]),
    );

    const result = await service.findOne("u1", "acc-1");

    expect(prisma.loan.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isExternal: false }) }),
    );
    expect(result.currentBalance).toBe(1000); // untouched — the 500 "external" loan isn't in this filtered result
  });

  it("excludes external loans from an account's LOAN_OUT movement ledger", async () => {
    prisma.loan.findMany.mockImplementation((args: { where: { isExternal?: boolean } }) =>
      Promise.resolve(args.where.isExternal === false ? [] : [{ id: "loan-1", totalAmount: "500", createdAt: new Date(), borrowerName: "Juan" }]),
    );
    const prismaFull = {
      ...prisma,
      transaction: { ...prisma.transaction, findMany: jest.fn().mockResolvedValue([]) },
      accountPayment: { ...prisma.accountPayment, findMany: jest.fn().mockResolvedValue([]) },
      loanPayment: { ...prisma.loanPayment, findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new AccountsService(prismaFull as unknown as PrismaService);

    const movements = await service.getMovements("u1", "acc-1");

    expect(prisma.loan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isExternal: false }) }),
    );
    expect(movements.find((m) => m.kind === "LOAN_OUT")).toBeUndefined();
  });
});
