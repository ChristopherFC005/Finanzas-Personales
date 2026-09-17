import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { QueryStatisticsDto } from "./dto/query-statistics.dto";

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId: string, query: QueryStatisticsDto) {
    const { start, end } = this.resolveRange(query);
    const { start: prevStart, end: prevEnd } = this.previousRange(start, end);

    const [current, previous, byCategory] = await Promise.all([
      this.totalsFor(userId, start, end),
      this.totalsFor(userId, prevStart, prevEnd),
      this.prisma.transaction.groupBy({
        by: ["categoryId"],
        where: {
          userId,
          type: "EXPENSE",
          deletedAt: null,
          transactionDate: { gte: start, lt: end },
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 1,
      }),
    ]);

    const topCategory = byCategory[0]
      ? await this.prisma.category.findUnique({
          where: { id: byCategory[0].categoryId },
          select: { id: true, name: true, icon: true },
        })
      : null;

    const days = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const savings = current.income - current.expenses;
    const savingsRate = current.income > 0 ? savings / current.income : 0;

    return {
      period: { start, end },
      income: current.income,
      expenses: current.expenses,
      savings,
      savingsRate,
      averageDailyExpense: current.expenses / days,
      topExpenseCategory: topCategory
        ? { ...topCategory, amount: Number(byCategory[0]._sum.amount ?? 0) }
        : null,
      comparedToPreviousPeriod: {
        income: this.percentChange(previous.income, current.income),
        expenses: this.percentChange(previous.expenses, current.expenses),
      },
    };
  }

  private async totalsFor(userId: string, start: Date, end: Date) {
    const rows = await this.prisma.transaction.groupBy({
      by: ["type"],
      where: {
        userId,
        deletedAt: null,
        transactionDate: { gte: start, lt: end },
      },
      _sum: { amount: true },
    });

    const income = Number(
      rows.find((r) => r.type === "INCOME")?._sum.amount ?? 0,
    );
    const expenses = Number(
      rows.find((r) => r.type === "EXPENSE")?._sum.amount ?? 0,
    );
    return { income, expenses };
  }

  private percentChange(previous: number, current: number): number | null {
    if (previous === 0) return null;
    return (current - previous) / previous;
  }

  private resolveRange(query: QueryStatisticsDto): { start: Date; end: Date } {
    const now = new Date();
    const startOfToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
    );

    switch (query.period) {
      case "three_months":
        return { start: this.monthsAgo(3), end: startOfToday };
      case "six_months":
        return { start: this.monthsAgo(6), end: startOfToday };
      case "year":
        return { start: this.monthsAgo(12), end: startOfToday };
      case "custom": {
        if (!query.dateFrom || !query.dateTo) {
          throw new BadRequestException(
            "dateFrom y dateTo son requeridos para un periodo personalizado.",
          );
        }
        return {
          start: new Date(query.dateFrom),
          end: new Date(query.dateTo),
        };
      }
      case "this_month":
      default:
        return {
          start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
          end: startOfToday,
        };
    }
  }

  private previousRange(start: Date, end: Date): { start: Date; end: Date } {
    const spanMs = end.getTime() - start.getTime();
    return {
      start: new Date(start.getTime() - spanMs),
      end: new Date(start.getTime()),
    };
  }

  private monthsAgo(months: number): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1),
    );
  }
}
