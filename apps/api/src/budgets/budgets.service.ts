import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateBudgetDto } from "./dto/create-budget.dto";
import { UpdateBudgetDto } from "./dto/update-budget.dto";
import { QueryBudgetsDto } from "./dto/query-budgets.dto";

export type BudgetStatus = "NORMAL" | "WARNING" | "EXCEEDED";

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: QueryBudgetsDto) {
    const now = new Date();
    const month = query.month ?? now.getMonth() + 1;
    const year = query.year ?? now.getFullYear();

    const budgets = await this.prisma.budget.findMany({
      where: { userId, month, year },
      include: { category: true },
      orderBy: { category: { name: "asc" } },
    });

    if (budgets.length === 0) {
      return [];
    }

    const { start, end } = this.monthRange(month, year);
    const spentByCategory = await this.prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        type: "EXPENSE",
        deletedAt: null,
        transactionDate: { gte: start, lt: end },
        categoryId: { in: budgets.map((b) => b.categoryId) },
      },
      _sum: { amount: true },
    });

    const spentMap = new Map(
      spentByCategory.map((row) => [
        row.categoryId,
        Number(row._sum.amount ?? 0),
      ]),
    );

    return budgets.map((budget) => {
      const spent = spentMap.get(budget.categoryId) ?? 0;
      const amount = Number(budget.amount);
      const percentage = amount > 0 ? Math.round((spent / amount) * 100) : 0;
      return {
        ...budget,
        spent,
        percentage,
        status: this.statusFor(percentage, budget.alertPercentage),
      };
    });
  }

  async create(userId: string, dto: CreateBudgetDto) {
    try {
      return await this.prisma.budget.create({
        data: { ...dto, userId },
        include: { category: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "Ya existe un presupuesto para esta categoría en este periodo.",
        );
      }
      throw error;
    }
  }

  async update(userId: string, id: string, dto: UpdateBudgetDto) {
    await this.getOwnedOrThrow(userId, id);
    try {
      return await this.prisma.budget.update({
        where: { id },
        data: dto,
        include: { category: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "Ya existe un presupuesto para esta categoría en este periodo.",
        );
      }
      throw error;
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.getOwnedOrThrow(userId, id);
    await this.prisma.budget.delete({ where: { id } });
  }

  private async getOwnedOrThrow(userId: string, id: string) {
    const budget = await this.prisma.budget.findUnique({ where: { id } });
    if (!budget || budget.userId !== userId) {
      throw new NotFoundException("Presupuesto no encontrado.");
    }
    return budget;
  }

  private monthRange(month: number, year: number) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    return { start, end };
  }

  private statusFor(percentage: number, alertPercentage: number): BudgetStatus {
    if (percentage >= 100) return "EXCEEDED";
    if (percentage >= alertPercentage) return "WARNING";
    return "NORMAL";
  }
}
