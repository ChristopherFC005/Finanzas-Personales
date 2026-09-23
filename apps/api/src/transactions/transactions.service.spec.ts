import { BadRequestException, NotFoundException } from "@nestjs/common";
import { TransactionsService } from "./transactions.service";
import { PrismaService } from "../common/prisma/prisma.service";

describe("TransactionsService — ownership isolation", () => {
  let service: TransactionsService;
  let prisma: { transaction: { findFirst: jest.Mock } };

  beforeEach(() => {
    prisma = {
      transaction: {
        findFirst: jest.fn(),
      },
    };
    service = new TransactionsService(prisma as unknown as PrismaService);
  });

  it("returns the transaction when it belongs to the requesting user", async () => {
    prisma.transaction.findFirst.mockResolvedValue({
      id: "txn-1",
      userId: "user-a",
    });

    const result = await service.findOne("user-a", "txn-1");

    expect(result).toEqual({ id: "txn-1", userId: "user-a" });
    expect(prisma.transaction.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "txn-1", userId: "user-a", deletedAt: null },
      }),
    );
  });

  it("denies access when user B requests user A's transaction", async () => {
    // The where clause scopes to userId: "user-b", so Prisma will never
    // return user A's row — this is the ownership check surfacing as 404,
    // not a 200 with someone else's financial data.
    prisma.transaction.findFirst.mockResolvedValue(null);

    await expect(service.findOne("user-b", "txn-1")).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.transaction.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "txn-1", userId: "user-b", deletedAt: null },
      }),
    );
  });
});

describe("TransactionsService — account/payment-method business rules", () => {
  let service: TransactionsService;
  let prisma: {
    category: { findUnique: jest.Mock };
    account: { findUnique: jest.Mock };
    transaction: { create: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      category: { findUnique: jest.fn() },
      account: { findUnique: jest.fn() },
      transaction: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    };
    service = new TransactionsService(prisma as unknown as PrismaService);
    prisma.category.findUnique.mockResolvedValue({ id: "cat-1", userId: null });
  });

  it("rejects an INCOME transaction targeting a credit card account", async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: "acc-1",
      userId: "user-a",
      type: "CREDIT",
    });

    await expect(
      service.create("user-a", {
        type: "INCOME",
        amount: "100",
        categoryId: "cat-1",
        accountId: "acc-1",
        transactionDate: "2026-01-01",
      } as never),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it("allows an EXPENSE against the same credit card account", async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: "acc-1",
      userId: "user-a",
      type: "CREDIT",
    });
    prisma.transaction.create.mockResolvedValue({ id: "txn-1" });

    await service.create("user-a", {
      type: "EXPENSE",
      amount: "100",
      categoryId: "cat-1",
      accountId: "acc-1",
      transactionDate: "2026-01-01",
    } as never);

    expect(prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentMethod: "CREDIT" }),
      }),
    );
  });

  it("derives paymentMethod from the account instead of trusting the client", async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: "acc-1",
      userId: "user-a",
      type: "DEBIT",
    });
    prisma.transaction.create.mockResolvedValue({ id: "txn-1" });

    // Client claims CASH, but the selected account is a debit card.
    await service.create("user-a", {
      type: "EXPENSE",
      amount: "50",
      categoryId: "cat-1",
      accountId: "acc-1",
      paymentMethod: "CASH",
      transactionDate: "2026-01-01",
    } as never);

    expect(prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentMethod: "DEBIT" }),
      }),
    );
  });

  it("re-validates against the existing account when only `type` changes on update", async () => {
    prisma.transaction.findFirst.mockResolvedValue({
      id: "txn-1",
      userId: "user-a",
      type: "EXPENSE",
      accountId: "acc-1",
      account: { id: "acc-1", type: "CREDIT" },
    });
    prisma.account.findUnique.mockResolvedValue({
      id: "acc-1",
      userId: "user-a",
      type: "CREDIT",
    });

    // No accountId in this PATCH — it's inherited from the existing row.
    await expect(
      service.update("user-a", "txn-1", { type: "INCOME" } as never),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.transaction.update).not.toHaveBeenCalled();
  });
});
