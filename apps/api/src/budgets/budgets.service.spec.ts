import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { BudgetsService } from "./budgets.service";
import { PrismaService } from "../common/prisma/prisma.service";

describe("BudgetsService", () => {
  let service: BudgetsService;
  let prisma: {
    budget: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    transaction: { groupBy: jest.Mock; aggregate: jest.Mock };
    category: { findUnique: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      budget: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      transaction: { groupBy: jest.fn(), aggregate: jest.fn() },
      category: { findUnique: jest.fn() },
    };
    service = new BudgetsService(prisma as unknown as PrismaService);
  });

  describe("create", () => {
    it("rejects a category that isn't an EXPENSE category", async () => {
      prisma.category.findUnique.mockResolvedValue({ id: "cat-1", userId: "u1", type: "INCOME" });

      await expect(
        service.create("u1", { categoryId: "cat-1", amount: "500", month: 3, year: 2026 }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.budget.create).not.toHaveBeenCalled();
    });

    it("rejects a category owned by another user", async () => {
      prisma.category.findUnique.mockResolvedValue({ id: "cat-1", userId: "user-b", type: "EXPENSE" });

      await expect(
        service.create("user-a", { categoryId: "cat-1", amount: "500", month: 3, year: 2026 }),
      ).rejects.toThrow(BadRequestException);
    });

    it("surfaces the unique-constraint violation as a friendly conflict error", async () => {
      prisma.category.findUnique.mockResolvedValue({ id: "cat-1", userId: "u1", type: "EXPENSE" });
      prisma.budget.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "6.19.3" }),
      );

      await expect(
        service.create("u1", { categoryId: "cat-1", amount: "500", month: 3, year: 2026 }),
      ).rejects.toThrow(ConflictException);
    });

    it("defaults alertPercentage to 80 when omitted", async () => {
      prisma.category.findUnique.mockResolvedValue({ id: "cat-1", userId: "u1", type: "EXPENSE" });
      prisma.budget.create.mockResolvedValue({
        id: "b1", userId: "u1", categoryId: "cat-1", amount: "500", month: 3, year: 2026,
        alertPercentage: 80, category: { id: "cat-1", name: "Comida", icon: null },
      });

      await service.create("u1", { categoryId: "cat-1", amount: "500", month: 3, year: 2026 });

      expect(prisma.budget.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ alertPercentage: 80 }) }),
      );
    });
  });

  describe("findAll — computed spend", () => {
    it("computes percentageUsed, isNearLimit and isOverLimit from actual spend", async () => {
      prisma.budget.findMany.mockResolvedValue([
        { id: "b1", userId: "u1", categoryId: "cat-1", amount: "1000", month: 3, year: 2026, alertPercentage: 80, category: { id: "cat-1", name: "Comida", icon: null } },
        { id: "b2", userId: "u1", categoryId: "cat-2", amount: "200", month: 3, year: 2026, alertPercentage: 80, category: { id: "cat-2", name: "Transporte", icon: null } },
      ]);
      prisma.transaction.groupBy.mockResolvedValue([
        { categoryId: "cat-1", _sum: { amount: 850 } }, // 85% -> near limit
        { categoryId: "cat-2", _sum: { amount: 250 } }, // 125% -> over limit
      ]);

      const result = await service.findAll("u1", { month: 3, year: 2026 });

      expect(result[0]).toMatchObject({ spent: 850, remaining: 150, isNearLimit: true, isOverLimit: false });
      expect(result[1]).toMatchObject({ spent: 250, remaining: 0, isNearLimit: false, isOverLimit: true });
    });

    it("treats a category with no spend yet as 0 spent, not a crash", async () => {
      prisma.budget.findMany.mockResolvedValue([
        { id: "b1", userId: "u1", categoryId: "cat-1", amount: "1000", month: 3, year: 2026, alertPercentage: 80, category: { id: "cat-1", name: "Comida", icon: null } },
      ]);
      prisma.transaction.groupBy.mockResolvedValue([]);

      const result = await service.findAll("u1", { month: 3, year: 2026 });

      expect(result[0]).toMatchObject({ spent: 0, remaining: 1000, isNearLimit: false, isOverLimit: false });
    });

    it("defaults to the current month/year when neither is given", async () => {
      prisma.budget.findMany.mockResolvedValue([]);

      await service.findAll("u1", {});

      const now = new Date();
      expect(prisma.budget.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "u1", month: now.getUTCMonth() + 1, year: now.getUTCFullYear() },
        }),
      );
    });
  });

  describe("ownership isolation", () => {
    it("does not let user B update user A's budget", async () => {
      prisma.budget.findUnique.mockResolvedValue({ id: "b1", userId: "user-a" });

      await expect(
        service.update("user-b", "b1", { amount: "999" }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.budget.update).not.toHaveBeenCalled();
    });

    it("does not let user B delete user A's budget", async () => {
      prisma.budget.findUnique.mockResolvedValue({ id: "b1", userId: "user-a" });

      await expect(service.remove("user-b", "b1")).rejects.toThrow(NotFoundException);
      expect(prisma.budget.delete).not.toHaveBeenCalled();
    });
  });
});
