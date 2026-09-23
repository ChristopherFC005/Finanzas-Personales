import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Account, PaymentMethod, Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { paginate } from "../common/pagination/pagination.dto";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { UpdateTransactionDto } from "./dto/update-transaction.dto";
import { QueryTransactionsDto } from "./dto/query-transactions.dto";

// A transaction's payment method is derived from the account it's tied to
// (spec: picking a card locks the method to "that card", it's never a free
// choice alongside an account) — never trusted from the client when an
// account is present, so a manipulated request can't claim a debit card
// purchase was "cash".
const PAYMENT_METHOD_BY_ACCOUNT_TYPE: Record<Account["type"], PaymentMethod> = {
  CASH: "CASH",
  DEBIT: "DEBIT",
  CREDIT: "CREDIT",
  SAVINGS: "DEBIT",
  OTHER: "OTHER",
};

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
    const account = dto.accountId
      ? await this.resolveAccount(userId, dto.accountId, dto.type)
      : null;

    return this.prisma.transaction.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        accountId: dto.accountId,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        paymentMethod: account
          ? PAYMENT_METHOD_BY_ACCOUNT_TYPE[account.type]
          : dto.paymentMethod,
        transactionDate: new Date(dto.transactionDate),
        notes: dto.notes,
      },
      include: { category: true, account: true },
    });
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const existing = await this.findOne(userId, id);
    if (dto.categoryId) {
      await this.assertCategoryUsable(userId, dto.categoryId);
    }

    // Re-derive from the EFFECTIVE account/type (whichever this call keeps
    // or changes), not just whatever field this particular PATCH happened
    // to touch — otherwise flipping type to INCOME on a transaction that
    // already has a credit card account (without resending accountId)
    // would skip the credit-card-can't-receive-income check entirely.
    const effectiveType = dto.type ?? existing.type;
    const effectiveAccountId =
      dto.accountId !== undefined ? dto.accountId : existing.accountId;
    const account = effectiveAccountId
      ? await this.resolveAccount(userId, effectiveAccountId, effectiveType)
      : null;

    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...dto,
        paymentMethod: account
          ? PAYMENT_METHOD_BY_ACCOUNT_TYPE[account.type]
          : dto.paymentMethod,
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

  /** Also enforces: a credit card can't be the account for an INCOME transaction. */
  private async resolveAccount(
    userId: string,
    accountId: string,
    transactionType: string,
  ): Promise<Account> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });
    if (!account || account.userId !== userId) {
      throw new BadRequestException("Cuenta inválida.");
    }
    if (account.type === "CREDIT" && transactionType === "INCOME") {
      throw new BadRequestException(
        "Una tarjeta de crédito no puede recibir ingresos. Usa 'Pagar tarjeta' para registrar un pago.",
      );
    }
    return account;
  }
}
