import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Account, TransactionType } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateAccountDto } from "./dto/create-account.dto";
import { UpdateAccountDto } from "./dto/update-account.dto";
import { PayCreditCardDto } from "./dto/pay-credit-card.dto";

interface MovementTotal {
  accountId: string | null;
  type: TransactionType;
  _sum: { amount: unknown };
}

interface PaymentTotal {
  accountId: string;
  isInstallment: boolean;
  _sum: { amount: unknown };
}

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    });

    if (accounts.length === 0) {
      return [];
    }

    const accountIds = accounts.map((a) => a.id);
    const [movements, payments] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ["accountId", "type"],
        where: { userId, deletedAt: null, accountId: { in: accountIds } },
        _sum: { amount: true },
      }),
      this.prisma.accountPayment.groupBy({
        by: ["accountId", "isInstallment"],
        where: { userId, accountId: { in: accountIds } },
        _sum: { amount: true },
      }),
    ]);

    return accounts.map((account) =>
      this.withComputedBalance(account, movements, payments),
    );
  }

  async findOne(userId: string, id: string) {
    const account = await this.getOwnedOrThrow(userId, id);
    const [movements, payments] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ["accountId", "type"],
        where: { userId, deletedAt: null, accountId: id },
        _sum: { amount: true },
      }),
      this.prisma.accountPayment.groupBy({
        by: ["accountId", "isInstallment"],
        where: { userId, accountId: id },
        _sum: { amount: true },
      }),
    ]);
    return this.withComputedBalance(account, movements, payments);
  }

  async create(userId: string, dto: CreateAccountDto) {
    const account = await this.prisma.account.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        bank: dto.bank,
        initialBalance: dto.initialBalance ?? "0",
        creditLimit: dto.creditLimit,
        color: dto.color,
      },
    });
    return this.withComputedBalance(account, [], []);
  }

  async update(userId: string, id: string, dto: UpdateAccountDto) {
    await this.getOwnedOrThrow(userId, id);
    await this.prisma.account.update({ where: { id }, data: dto });
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.getOwnedOrThrow(userId, id);
    await this.prisma.account.delete({ where: { id } });
  }

  /**
   * Paying a credit card is its own action, not a generic transaction: a
   * regular payment reduces debt AND immediately frees up that much credit
   * line, but a payment made "a cuotas" (installments) only reduces the
   * debt shown — the bank keeps that amount committed to the installment
   * plan, so it must NOT come back as available credit yet.
   */
  async payCreditCard(userId: string, id: string, dto: PayCreditCardDto) {
    const account = await this.getOwnedOrThrow(userId, id);
    if (account.type !== "CREDIT") {
      throw new BadRequestException(
        "Solo se pueden registrar pagos para tarjetas de crédito.",
      );
    }

    await this.prisma.accountPayment.create({
      data: {
        accountId: id,
        userId,
        amount: dto.amount,
        isInstallment: dto.isInstallment ?? false,
      },
    });

    return this.findOne(userId, id);
  }

  private async getOwnedOrThrow(userId: string, id: string): Promise<Account> {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account || account.userId !== userId) {
      throw new NotFoundException("Cuenta no encontrada.");
    }
    return account;
  }

  private withComputedBalance(
    account: Account,
    movements: MovementTotal[],
    payments: PaymentTotal[],
  ) {
    const income = Number(
      movements.find((m) => m.accountId === account.id && m.type === "INCOME")?._sum
        .amount ?? 0,
    );
    const expense = Number(
      movements.find((m) => m.accountId === account.id && m.type === "EXPENSE")?._sum
        .amount ?? 0,
    );
    const totalPayments = payments
      .filter((p) => p.accountId === account.id)
      .reduce((sum, p) => sum + Number(p._sum.amount ?? 0), 0);
    const installmentReserved = payments
      .filter((p) => p.accountId === account.id && p.isInstallment)
      .reduce((sum, p) => sum + Number(p._sum.amount ?? 0), 0);

    // Card payments reduce debt (increase the balance toward/above zero)
    // exactly like income would, but never flow through the Transaction
    // ledger — a credit card cannot receive "income" (spec: point 5).
    const currentBalance =
      Number(account.initialBalance) + income - expense + totalPayments;
    const creditLimit = account.creditLimit ? Number(account.creditLimit) : null;

    return {
      ...account,
      currentBalance,
      availableCredit:
        account.type === "CREDIT" && creditLimit !== null
          ? creditLimit + currentBalance - installmentReserved
          : null,
    };
  }
}
