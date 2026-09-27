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

interface LoanTotal {
  accountId: string | null;
  _sum: { totalAmount: unknown };
}

interface LoanPaymentTotal {
  accountId: string | null;
  _sum: { amount: unknown };
}

const CARD_DATES_EDIT_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

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
    const [movements, payments, loans, loanPayments] = await Promise.all([
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
      this.prisma.loan.groupBy({
        by: ["accountId"],
        where: { userId, accountId: { in: accountIds }, status: { not: "CANCELLED" } },
        _sum: { totalAmount: true },
      }),
      this.prisma.loanPayment.groupBy({
        by: ["accountId"],
        where: { userId, accountId: { in: accountIds } },
        _sum: { amount: true },
      }),
    ]);

    return accounts.map((account) =>
      this.withComputedBalance(account, movements, payments, loans, loanPayments),
    );
  }

  async findOne(userId: string, id: string) {
    const account = await this.getOwnedOrThrow(userId, id);
    const [movements, payments, loans, loanPayments] = await Promise.all([
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
      this.prisma.loan.groupBy({
        by: ["accountId"],
        where: { userId, accountId: id, status: { not: "CANCELLED" } },
        _sum: { totalAmount: true },
      }),
      this.prisma.loanPayment.groupBy({
        by: ["accountId"],
        where: { userId, accountId: id },
        _sum: { amount: true },
      }),
    ]);
    return this.withComputedBalance(account, movements, payments, loans, loanPayments);
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
        billingDate: dto.billingDate ? new Date(dto.billingDate) : undefined,
        paymentDueDate: dto.paymentDueDate ? new Date(dto.paymentDueDate) : undefined,
      },
    });
    return this.withComputedBalance(account, [], [], [], []);
  }

  async update(userId: string, id: string, dto: UpdateAccountDto) {
    const account = await this.getOwnedOrThrow(userId, id);

    if (dto.billingDate !== undefined || dto.paymentDueDate !== undefined) {
      if (account.type !== "CREDIT") {
        throw new BadRequestException(
          "La fecha de corte y de pago solo aplican a tarjetas de crédito.",
        );
      }
      if (Date.now() - account.createdAt.getTime() > CARD_DATES_EDIT_WINDOW_MS) {
        throw new BadRequestException(
          "Solo puedes agregar o cambiar la fecha de corte/pago dentro de los 3 días posteriores a la creación de la tarjeta.",
        );
      }
    }

    await this.prisma.account.update({
      where: { id },
      data: {
        ...dto,
        billingDate: dto.billingDate ? new Date(dto.billingDate) : undefined,
        paymentDueDate: dto.paymentDueDate ? new Date(dto.paymentDueDate) : undefined,
      },
    });
    return this.findOne(userId, id);
  }

  /**
   * Detailed, chronological ledger for a single account: regular
   * transactions, card payments, money lent out (if this account funded a
   * loan), and loan repayments credited back to it — everything that moves
   * this account's balance, in one list.
   */
  async getMovements(userId: string, id: string) {
    await this.getOwnedOrThrow(userId, id);

    const [transactions, payments, loans, loanPayments] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId, accountId: id, deletedAt: null },
        include: { category: { select: { name: true, icon: true } } },
        orderBy: { transactionDate: "desc" },
      }),
      this.prisma.accountPayment.findMany({
        where: { userId, accountId: id },
        orderBy: { paidAt: "desc" },
      }),
      this.prisma.loan.findMany({
        where: { userId, accountId: id, status: { not: "CANCELLED" } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.loanPayment.findMany({
        where: { userId, accountId: id },
        include: { loan: { select: { borrowerName: true } } },
        orderBy: { paidAt: "desc" },
      }),
    ]);

    const movements = [
      ...transactions.map((t) => ({
        id: t.id,
        kind: t.type as "INCOME" | "EXPENSE",
        amount: Number(t.amount),
        date: t.transactionDate,
        label: t.category.name,
        description: t.description,
      })),
      ...payments.map((p) => ({
        id: p.id,
        kind: "CARD_PAYMENT" as const,
        amount: Number(p.amount),
        date: p.paidAt,
        label: p.isInstallment ? "Pago a cuotas" : "Pago de tarjeta",
        description: null,
      })),
      ...loans.map((l) => ({
        id: l.id,
        kind: "LOAN_OUT" as const,
        amount: Number(l.totalAmount),
        date: l.createdAt,
        label: `Préstamo a ${l.borrowerName}`,
        description: null,
      })),
      ...loanPayments.map((lp) => ({
        id: lp.id,
        kind: "LOAN_PAYMENT_IN" as const,
        amount: Number(lp.amount),
        date: lp.paidAt,
        label: `Pago de préstamo de ${lp.loan.borrowerName}`,
        description: null,
      })),
    ];

    movements.sort((a, b) => b.date.getTime() - a.date.getTime());
    return movements;
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
    loans: LoanTotal[] = [],
    loanPayments: LoanPaymentTotal[] = [],
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
    // Money lent to someone else leaves the account it was funded from —
    // the loan is only "back" if it's later reversed (status CANCELLED),
    // repayments from the borrower don't return to this account (spec).
    const lent = loans
      .filter((l) => l.accountId === account.id)
      .reduce((sum, l) => sum + Number(l._sum.totalAmount ?? 0), 0);
    // A borrower paying back a loan is credited to the account/card it was
    // originally lent from — the app's simplified model treats it like
    // getting that money back, the same way a card payment renews debt.
    const loanRepaid = loanPayments
      .filter((lp) => lp.accountId === account.id)
      .reduce((sum, lp) => sum + Number(lp._sum.amount ?? 0), 0);

    // Card payments reduce debt (increase the balance toward/above zero)
    // exactly like income would, but never flow through the Transaction
    // ledger — a credit card cannot receive "income" (spec: point 5).
    const currentBalance =
      Number(account.initialBalance) + income - expense + totalPayments - lent + loanRepaid;
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
