import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Budget, Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateBudgetDto } from "./dto/create-budget.dto";
import { UpdateBudgetDto } from "./dto/update-budget.dto";
import { QueryBudgetsDto } from "./dto/query-budgets.dto";

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: QueryBudgetsDto) {
    const now = new Date();
    const month = query.month ?? now.getUTCMonth() + 1;
    const year = query.year ?? now.getUTCFullYear();

    const budgets = await this.prisma.budget.findMany({
      where: { userId, month, year },
      include: { category: { select: { id: true, name: true, icon: true } } },
      orderBy: { createdAt: "asc" },
    });
    if (budgets.length === 0) return [];

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    const spentByCategory = await this.prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        type: "EXPENSE",
        deletedAt: null,
        categoryId: { in: budgets.map((b) => b.categoryId) },
        transactionDate: { gte: start, lt: end },
      },
      _sum: { amount: true },
    });

    return budgets.map((budget) => this.withComputed(budget, spentByCategory));
  }

  async create(userId: string, dto: CreateBudgetDto) {
    await this.assertCategoryUsable(userId, dto.categoryId);
    try {
      const budget = await this.prisma.budget.create({
        data: {
          userId,
          categoryId: dto.categoryId,
          amount: dto.amount,
          month: dto.month,
          year: dto.year,
          alertPercentage: dto.alertPercentage ?? 80,
        },
        include: { category: { select: { id: true, name: true, icon: true } } },
      });
      return this.withComputed(budget, []);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Ya tienes un presupuesto para esta categoría en ese mes.");
      }
      throw error;
    }
  }

  async update(userId: string, id: string, dto: UpdateBudgetDto) {
    await this.getOwnedOrThrow(userId, id);
    const budget = await this.prisma.budget.update({
      where: { id },
      data: dto,
      include: { category: { select: { id: true, name: true, icon: true } } },
    });

    const start = new Date(Date.UTC(budget.year, budget.month - 1, 1));
    const end = new Date(Date.UTC(budget.year, budget.month, 1));
    const sum = await this.prisma.transaction.aggregate({
      where: {
        userId,
        type: "EXPENSE",
        deletedAt: null,
        categoryId: budget.categoryId,
        transactionDate: { gte: start, lt: end },
      },
      _sum: { amount: true },
    });
    return this.withComputed(budget, [{ categoryId: budget.categoryId, _sum: sum._sum }]);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.getOwnedOrThrow(userId, id);
    await this.prisma.budget.delete({ where: { id } });
  }

  private async assertCategoryUsable(userId: string, categoryId: string): Promise<void> {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category || (category.userId !== null && category.userId !== userId)) {
      throw new BadRequestException("Categoría inválida.");
    }
    if (category.type !== "EXPENSE") {
      throw new BadRequestException("Solo puedes presupuestar categorías de gasto.");
    }
  }

  private async getOwnedOrThrow(userId: string, id: string): Promise<
    Budget & { category: { id: string; name: string; icon: string | null } }
  > {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true, icon: true } } },
    });
    if (!budget || budget.userId !== userId) {
      throw new NotFoundException("Presupuesto no encontrado.");
    }
    return budget;
  }

  private withComputed(
    budget: Budget & { category: { id: string; name: string; icon: string | null } },
    spentByCategory: { categoryId: string; _sum: { amount: unknown } }[],
  ) {
    const spent = Number(
      spentByCategory.find((s) => s.categoryId === budget.categoryId)?._sum.amount ?? 0,
    );
    const amount = Number(budget.amount);
    const percentageUsed = amount > 0 ? spent / amount : 0;

    return {
      ...budget,
      spent,
      remaining: Math.max(0, amount - spent),
      percentageUsed,
      isNearLimit: percentageUsed >= budget.alertPercentage / 100 && percentageUsed < 1,
      isOverLimit: percentageUsed >= 1,
    };
  }
}
