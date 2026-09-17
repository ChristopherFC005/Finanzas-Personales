import { NotFoundException } from "@nestjs/common";
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
