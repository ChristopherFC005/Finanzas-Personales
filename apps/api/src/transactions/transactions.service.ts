import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { paginate } from "../common/pagination/pagination.dto";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { UpdateTransactionDto } from "./dto/update-transaction.dto";
import { QueryTransactionsDto } from "./dto/query-transactions.dto";

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: QueryTransactionsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.TransactionWhereInput = {
      userId,
      deletedAt: null,
      type: query.type,
      categoryId: query.categoryId,
      accountId: query.accountId,
      paymentMethod: query.paymentMethod,
      transactionDate:
        query.dateFrom || query.dateTo
          ? {
              gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
              lte: query.dateTo ? new Date(query.dateTo) : undefined,
            }
          : undefined,
      description: query.search
        ? { contains: query.search, mode: "insensitive" }
        : undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        include: { category: true, account: true },
        orderBy: { [query.sortBy ?? "transactionDate"]: query.sortOrder ?? "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(userId: string, id: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
      include: { category: true, account: true },
    });
    if (!transaction) {
      throw new NotFoundException("Transacción no encontrada.");
    }
    return transaction;
  }

  async create(userId: string, dto: CreateTransactionDto) {
    await this.assertCategoryUsable(userId, dto.categoryId);
    if (dto.accountId) {
      await this.assertAccountOwned(userId, dto.accountId);
    }
    return this.prisma.transaction.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        accountId: dto.accountId,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        paymentMethod: dto.paymentMethod,
        transactionDate: new Date(dto.transactionDate),
        notes: dto.notes,
      },
      include: { category: true, account: true },
    });
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    await this.findOne(userId, id);
    if (dto.categoryId) {
      await this.assertCategoryUsable(userId, dto.categoryId);
    }
    if (dto.accountId) {
      await this.assertAccountOwned(userId, dto.accountId);
    }
    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...dto,
        transactionDate: dto.transactionDate
          ? new Date(dto.transactionDate)
          : undefined,
      },
      include: { category: true, account: true },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);
    await this.prisma.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async assertCategoryUsable(
    userId: string,
    categoryId: string,
  ): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category || (category.userId !== null && category.userId !== userId)) {
      throw new BadRequestException("Categoría inválida.");
    }
  }

  private async assertAccountOwned(userId: string, accountId: string): Promise<void> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });
    if (!account || account.userId !== userId) {
      throw new BadRequestException("Cuenta inválida.");
    }
  }
}
