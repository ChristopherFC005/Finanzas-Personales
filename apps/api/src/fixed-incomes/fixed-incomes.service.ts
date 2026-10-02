import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { FixedIncome } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { daysInMonth } from "../accounts/billing-date.util";
import { CreateFixedIncomeDto } from "./dto/create-fixed-income.dto";
import { UpdateFixedIncomeDto } from "./dto/update-fixed-income.dto";

const SELECT_RELATIONS = {
  category: { select: { id: true, name: true, icon: true } },
  account: { select: { id: true, name: true, bank: true, type: true } },
};

@Injectable()
export class FixedIncomesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const incomes = await this.prisma.fixedIncome.findMany({
      where: { userId },
      include: SELECT_RELATIONS,
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    });
    if (incomes.length === 0) return [];

    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const receivedRows = await this.prisma.transaction.findMany({
      where: {
        fixedIncomeId: { in: incomes.map((i) => i.id) },
        transactionDate: { gte: startOfMonth },
        deletedAt: null,
      },
      select: { fixedIncomeId: true },
    });
    const receivedIds = new Set(receivedRows.map((r) => r.fixedIncomeId));

    return incomes.map((income) => this.withComputed(income, receivedIds.has(income.id), now));
  }

  async create(userId: string, dto: CreateFixedIncomeDto) {
    await this.assertCategoryUsable(userId, dto.categoryId);
    await this.assertAccountUsable(userId, dto.accountId);

    const income = await this.prisma.fixedIncome.create({
      data: {
        userId,
        name: dto.name,
        categoryId: dto.categoryId,
        accountId: dto.accountId,
        amount: dto.amount,
        dayOfMonth: dto.dayOfMonth,
        notes: dto.notes,
      },
      include: SELECT_RELATIONS,
    });
    return this.withComputed(income, false, new Date());
  }

  async update(userId: string, id: string, dto: UpdateFixedIncomeDto) {
    await this.getOwnedOrThrow(userId, id);
    if (dto.categoryId) {
      await this.assertCategoryUsable(userId, dto.categoryId);
    }
    if (dto.accountId) {
      await this.assertAccountUsable(userId, dto.accountId);
    }

    const income = await this.prisma.fixedIncome.update({
      where: { id },
      data: dto,
      include: SELECT_RELATIONS,
    });

    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const received = await this.prisma.transaction.findFirst({
      where: { fixedIncomeId: id, transactionDate: { gte: startOfMonth }, deletedAt: null },
    });
    return this.withComputed(income, received !== null, now);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.getOwnedOrThrow(userId, id);
    await this.prisma.fixedIncome.delete({ where: { id } });
  }

  private async assertCategoryUsable(userId: string, categoryId: string): Promise<void> {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category || (category.userId !== null && category.userId !== userId)) {
      throw new BadRequestException("Categoría inválida.");
    }
    if (category.type !== "INCOME") {
      throw new BadRequestException("Un ingreso fijo debe usar una categoría de ingreso.");
    }
  }

  private async assertAccountUsable(userId: string, accountId: string): Promise<void> {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account || account.userId !== userId) {
      throw new NotFoundException("Cuenta no encontrada.");
    }
    if (account.type === "CREDIT") {
      throw new BadRequestException(
        "Una tarjeta de crédito no puede recibir ingresos. Elige una cuenta de débito, ahorro o efectivo.",
      );
    }
  }

  private async getOwnedOrThrow(userId: string, id: string): Promise<FixedIncome> {
    const income = await this.prisma.fixedIncome.findUnique({ where: { id } });
    if (!income || income.userId !== userId) {
      throw new NotFoundException("Ingreso fijo no encontrado.");
    }
    return income;
  }

  private withComputed(
    income: FixedIncome & {
      category: { id: string; name: string; icon: string | null };
      account: { id: string; name: string; bank: string | null; type: string };
    },
    receivedThisMonth: boolean,
    now: Date,
  ) {
    const triggerDay = Math.min(income.dayOfMonth, daysInMonth(now.getUTCFullYear(), now.getUTCMonth()));
    const dueThisMonth = now.getUTCDate() <= triggerDay;

    let nextOccurrence: Date;
    if (!receivedThisMonth && dueThisMonth) {
      nextOccurrence = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), triggerDay));
    } else {
      const nextMonth = now.getUTCMonth() === 11 ? 0 : now.getUTCMonth() + 1;
      const nextYear = now.getUTCMonth() === 11 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
      nextOccurrence = new Date(
        Date.UTC(nextYear, nextMonth, Math.min(income.dayOfMonth, daysInMonth(nextYear, nextMonth))),
      );
    }

    return { ...income, receivedThisMonth, nextOccurrence };
  }
}
