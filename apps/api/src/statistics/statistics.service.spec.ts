import { StatisticsService } from "./statistics.service";
import { PrismaService } from "../common/prisma/prisma.service";

describe("StatisticsService — spending by category", () => {
  let service: StatisticsService;
  let prisma: {
    transaction: { groupBy: jest.Mock };
    category: { findMany: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      transaction: { groupBy: jest.fn() },
      category: { findMany: jest.fn() },
    };
    service = new StatisticsService(prisma as unknown as PrismaService);
  });

  it("returns an empty list when there are no expenses in the period", async () => {
    prisma.transaction.groupBy.mockResolvedValue([]);

    const result = await service.byCategory("u1", { period: "this_month" } as never);

    expect(result).toEqual([]);
    expect(prisma.category.findMany).not.toHaveBeenCalled();
  });

  it("computes each category's share of the total and sorts by amount desc", async () => {
    prisma.transaction.groupBy.mockResolvedValue([
      { categoryId: "cat-food", _sum: { amount: 300 } },
      { categoryId: "cat-transport", _sum: { amount: 100 } },
    ]);
    prisma.category.findMany.mockResolvedValue([
      { id: "cat-food", name: "Comida", icon: "utensils" },
      { id: "cat-transport", name: "Transporte", icon: "car" },
    ]);

    const result = await service.byCategory("u1", { period: "this_month" } as never);

    expect(result).toEqual([
      { categoryId: "cat-food", name: "Comida", icon: "utensils", amount: 300, percentage: 0.75 },
      { categoryId: "cat-transport", name: "Transporte", icon: "car", amount: 100, percentage: 0.25 },
    ]);
  });

  it("falls back to 'Sin categoría' for a category that no longer exists", async () => {
    prisma.transaction.groupBy.mockResolvedValue([{ categoryId: "cat-deleted", _sum: { amount: 50 } }]);
    prisma.category.findMany.mockResolvedValue([]);

    const result = await service.byCategory("u1", { period: "this_month" } as never);

    expect(result).toEqual([
      { categoryId: "cat-deleted", name: "Sin categoría", icon: null, amount: 50, percentage: 1 },
    ]);
  });
});
