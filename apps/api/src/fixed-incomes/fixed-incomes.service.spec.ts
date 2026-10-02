import { BadRequestException, NotFoundException } from "@nestjs/common";
import { FixedIncomesService } from "./fixed-incomes.service";
import { PrismaService } from "../common/prisma/prisma.service";

describe("FixedIncomesService", () => {
  let service: FixedIncomesService;
  let prisma: {
    fixedIncome: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock };
    transaction: { findMany: jest.Mock; findFirst: jest.Mock };
    category: { findUnique: jest.Mock };
    account: { findUnique: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      fixedIncome: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      transaction: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null) },
      category: { findUnique: jest.fn() },
      account: { findUnique: jest.fn() },
    };
    service = new FixedIncomesService(prisma as unknown as PrismaService);
  });

  describe("create", () => {
    it("rejects a category that isn't an INCOME category", async () => {
      prisma.category.findUnique.mockResolvedValue({ id: "cat-1", userId: "u1", type: "EXPENSE" });

      await expect(
        service.create("u1", { name: "Sueldo", categoryId: "cat-1", accountId: "acc-1", amount: "2000", dayOfMonth: 5 }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.fixedIncome.create).not.toHaveBeenCalled();
    });

    it("rejects a category owned by another user", async () => {
      prisma.category.findUnique.mockResolvedValue({ id: "cat-1", userId: "user-b", type: "INCOME" });

      await expect(
        service.create("user-a", { name: "Sueldo", categoryId: "cat-1", accountId: "acc-1", amount: "2000", dayOfMonth: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects a CREDIT account as the destination", async () => {
      prisma.category.findUnique.mockResolvedValue({ id: "cat-1", userId: "u1", type: "INCOME" });
      prisma.account.findUnique.mockResolvedValue({ id: "acc-1", userId: "u1", type: "CREDIT" });

      await expect(
        service.create("u1", { name: "Sueldo", categoryId: "cat-1", accountId: "acc-1", amount: "2000", dayOfMonth: 5 }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.fixedIncome.create).not.toHaveBeenCalled();
    });

    it("rejects an account owned by another user", async () => {
      prisma.category.findUnique.mockResolvedValue({ id: "cat-1", userId: "u1", type: "INCOME" });
      prisma.account.findUnique.mockResolvedValue({ id: "acc-1", userId: "user-b", type: "DEBIT" });

      await expect(
        service.create("u1", { name: "Sueldo", categoryId: "cat-1", accountId: "acc-1", amount: "2000", dayOfMonth: 5 }),
      ).rejects.toThrow(NotFoundException);
    });

    it("creates a fixed income against a valid INCOME category and non-credit account", async () => {
      prisma.category.findUnique.mockResolvedValue({ id: "cat-1", userId: "u1", type: "INCOME" });
      prisma.account.findUnique.mockResolvedValue({ id: "acc-1", userId: "u1", type: "DEBIT" });
      prisma.fixedIncome.create.mockResolvedValue({
        id: "fi-1", userId: "u1", categoryId: "cat-1", accountId: "acc-1", name: "Sueldo",
        amount: "2000", dayOfMonth: 5, isActive: true, notes: null,
        category: { id: "cat-1", name: "Salario", icon: "wallet" },
        account: { id: "acc-1", name: "BCP", bank: "BCP", type: "DEBIT" },
      });

      const result = await service.create("u1", {
        name: "Sueldo", categoryId: "cat-1", accountId: "acc-1", amount: "2000", dayOfMonth: 5,
      });

      expect(result.receivedThisMonth).toBe(false);
      expect(result.nextOccurrence).toBeInstanceOf(Date);
    });
  });

  describe("findAll — computed next occurrence", () => {
    const income = {
      id: "fi-1", userId: "u1", categoryId: "cat-1", accountId: "acc-1", name: "Sueldo",
      amount: "2000", dayOfMonth: 5, isActive: true, notes: null,
      category: { id: "cat-1", name: "Salario", icon: "wallet" },
      account: { id: "acc-1", name: "BCP", bank: "BCP", type: "DEBIT" },
    };

    it("marks receivedThisMonth=false and nextOccurrence=this month when not yet paid and day hasn't passed", async () => {
      prisma.fixedIncome.findMany.mockResolvedValue([income]);
      prisma.transaction.findMany.mockResolvedValue([]);
      jest.useFakeTimers().setSystemTime(new Date("2026-03-01T00:00:00.000Z"));

      const result = await service.findAll("u1");

      expect(result[0].receivedThisMonth).toBe(false);
      expect(result[0].nextOccurrence.getUTCMonth()).toBe(2); // March (0-indexed)
      expect(result[0].nextOccurrence.getUTCDate()).toBe(5);
      jest.useRealTimers();
    });

    it("rolls nextOccurrence to next month once already received this month", async () => {
      prisma.fixedIncome.findMany.mockResolvedValue([income]);
      prisma.transaction.findMany.mockResolvedValue([{ fixedIncomeId: "fi-1" }]);
      jest.useFakeTimers().setSystemTime(new Date("2026-03-10T00:00:00.000Z"));

      const result = await service.findAll("u1");

      expect(result[0].receivedThisMonth).toBe(true);
      expect(result[0].nextOccurrence.getUTCMonth()).toBe(3); // April
      jest.useRealTimers();
    });

    it("rolls nextOccurrence to next month once the day has passed without being received (caught up)", async () => {
      prisma.fixedIncome.findMany.mockResolvedValue([income]);
      prisma.transaction.findMany.mockResolvedValue([]);
      jest.useFakeTimers().setSystemTime(new Date("2026-03-20T00:00:00.000Z"));

      const result = await service.findAll("u1");

      expect(result[0].nextOccurrence.getUTCMonth()).toBe(3); // April
      jest.useRealTimers();
    });
  });

  describe("ownership isolation", () => {
    it("does not let user B update user A's fixed income", async () => {
      prisma.fixedIncome.findUnique.mockResolvedValue({ id: "fi-1", userId: "user-a" });

      await expect(service.update("user-b", "fi-1", { amount: "999" })).rejects.toThrow(NotFoundException);
      expect(prisma.fixedIncome.update).not.toHaveBeenCalled();
    });

    it("does not let user B delete user A's fixed income", async () => {
      prisma.fixedIncome.findUnique.mockResolvedValue({ id: "fi-1", userId: "user-a" });

      await expect(service.remove("user-b", "fi-1")).rejects.toThrow(NotFoundException);
      expect(prisma.fixedIncome.delete).not.toHaveBeenCalled();
    });
  });
});
