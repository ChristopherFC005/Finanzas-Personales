import { BadRequestException } from "@nestjs/common";
import { AccountsService } from "./accounts.service";
import { PrismaService } from "../common/prisma/prisma.service";

describe("AccountsService — credit line renewal", () => {
  let service: AccountsService;
  let prisma: {
    account: { findUnique: jest.Mock };
    accountPayment: { create: jest.Mock; groupBy: jest.Mock };
    transaction: { groupBy: jest.Mock };
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
      service.payCreditCard("u1", "acc-2", { amount: "100" }),
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
