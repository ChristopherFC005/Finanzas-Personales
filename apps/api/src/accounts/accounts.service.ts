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
import { lastCutoffDate } from "./billing-date.util";

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

interface PaymentSentTotal {
  sourceAccountId: string | null;
  _sum: { amount: unknown };
}

const CARD_DATES_EDIT_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const STATEMENT_AMOUNT_EPSILON = 0.01;

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
    const [movements, payments, loans, loanPayments, paymentsSent] = await Promise.all([
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
        where: {
          userId,
          accountId: { in: accountIds },
          status: { not: "CANCELLED" },
          isExternal: false,
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.loanPayment.groupBy({
        by: ["accountId"],
        where: { userId, accountId: { in: accountIds } },
        _sum: { amount: true },
      }),
      this.prisma.accountPayment.groupBy({
        by: ["sourceAccountId"],
        where: { userId, sourceAccountId: { in: accountIds } },
        _sum: { amount: true },
      }),
    ]);

    return Promise.all(
      accounts.map((account) =>
        this.withStatementDue(
          userId,
          this.withComputedBalance(account, movements, payments, loans, loanPayments, paymentsSent),
        ),
      ),
    );
  }

  async findOne(userId: string, id: string) {
    const account = await this.getOwnedOrThrow(userId, id);
    const [movements, payments, loans, loanPayments, paymentsSent] = await Promise.all([
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
        where: { userId, accountId: id, status: { not: "CANCELLED" }, isExternal: false },
        _sum: { totalAmount: true },
      }),
      this.prisma.loanPayment.groupBy({
        by: ["accountId"],
        where: { userId, accountId: id },
        _sum: { amount: true },
      }),
      this.prisma.accountPayment.groupBy({
        by: ["sourceAccountId"],
        where: { userId, sourceAccountId: id },
        _sum: { amount: true },
      }),
    ]);
    return this.withStatementDue(
      userId,
      this.withComputedBalance(account, movements, payments, loans, loanPayments, paymentsSent),
    );
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
    return this.withComputedBalance(account, [], [], [], [], []);
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
   * transactions, card payments (received, and sent to pay another card),
   * money lent out, and loan repayments credited back to it — everything
   * that moves this account's balance, in one list.
   */
  async getMovements(userId: string, id: string) {
    await this.getOwnedOrThrow(userId, id);

    const [transactions, payments, paymentsSent, loans, loanPayments] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId, accountId: id, deletedAt: null },
        include: { category: { select: { name: true, icon: true } } },
        orderBy: { transactionDate: "desc" },
      }),
      this.prisma.accountPayment.findMany({
        where: { userId, accountId: id },
        include: { sourceAccount: { select: { name: true } } },
        orderBy: { paidAt: "desc" },
      }),
      this.prisma.accountPayment.findMany({
        where: { userId, sourceAccountId: id },
        include: { account: { select: { name: true } } },
        orderBy: { paidAt: "desc" },
      }),
      this.prisma.loan.findMany({
        where: { userId, accountId: id, status: { not: "CANCELLED" }, isExternal: false },
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
        description: p.sourceAccount ? `desde ${p.sourceAccount.name}` : null,
      })),
      ...paymentsSent.map((p) => ({
        id: p.id,
        kind: "CARD_PAYMENT_OUT" as const,
        amount: Number(p.amount),
        date: p.paidAt,
        label: `Pago a tarjeta ${p.account.name}`,
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
   *
   * Two extra rules on top of that:
   *  - The money has to come FROM one of the user's own accounts/cards,
   *    which gets debited exactly like a loan's funding account does.
   *  - If a billing date is set, you can only pay off what was already
   *    charged before the last cutoff — charges after it belong to the
   *    next statement and aren't due yet.
   */
  async payCreditCard(userId: string, id: string, dto: PayCreditCardDto) {
    const account = await this.getOwnedOrThrow(userId, id);
    if (account.type !== "CREDIT") {
      throw new BadRequestException(
        "Solo se pueden registrar pagos para tarjetas de crédito.",
      );
    }
    if (dto.sourceAccountId === id) {
      throw new BadRequestException(
        "La cuenta de origen no puede ser la misma tarjeta que estás pagando.",
      );
    }
    await this.getOwnedOrThrow(userId, dto.sourceAccountId);

    if (account.billingDate) {
      const statementDebt = await this.getStatementDebt(userId, account);
      if (Number(dto.amount) > statementDebt + STATEMENT_AMOUNT_EPSILON) {
        throw new BadRequestException(
          `Solo puedes pagar hasta ${statementDebt.toFixed(2)}, lo que se cargó antes de tu último corte. Las compras después del corte se pagan en el siguiente periodo.`,
        );
      }
    }

    await this.prisma.accountPayment.create({
      data: {
        accountId: id,
        sourceAccountId: dto.sourceAccountId,
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

  /**
   * How much of the LAST closed statement is still unpaid. Debt frozen as
   * of the cutoff (`debtAsOfCutoff`) never falls just because time passes —
   * but a payment made *after* the cutoff (which is virtually every real
   * payment, since you pay once you see the statement) has to reduce it,
   * or this would never reach zero and would just keep blocking payment
   * forever. So any credit posted after the cutoff (a payment, or a loan
   * repayment credited to this card) is applied against the closed
   * statement first — the same way a real card statement works — before
   * ever counting toward the newer, not-yet-billed charges.
   */
  /** Not private: the card-due-date reminder cron (in CardRemindersService) also needs this. */
  async getStatementDebt(userId: string, account: Account): Promise<number> {
    if (!account.billingDate) return 0;
    const cutoff = lastCutoffDate(account.billingDate, new Date());

    const [expense, paymentsIn, paymentsOut, loansSent, loanRepaidAsOf, paymentsAfter, loanRepaidAfter] =
      await Promise.all([
        this.prisma.transaction.aggregate({
          where: {
            userId,
            accountId: account.id,
            deletedAt: null,
            type: "EXPENSE",
            transactionDate: { lte: cutoff },
          },
          _sum: { amount: true },
        }),
        this.prisma.accountPayment.aggregate({
          where: { userId, accountId: account.id, paidAt: { lte: cutoff } },
          _sum: { amount: true },
        }),
        this.prisma.accountPayment.aggregate({
          where: { userId, sourceAccountId: account.id, paidAt: { lte: cutoff } },
          _sum: { amount: true },
        }),
        this.prisma.loan.aggregate({
          where: {
            userId,
            accountId: account.id,
            status: { not: "CANCELLED" },
            isExternal: false,
            createdAt: { lte: cutoff },
          },
          _sum: { totalAmount: true },
        }),
        this.prisma.loanPayment.aggregate({
          where: { userId, accountId: account.id, paidAt: { lte: cutoff } },
          _sum: { amount: true },
        }),
        this.prisma.accountPayment.aggregate({
          where: { userId, accountId: account.id, paidAt: { gt: cutoff } },
          _sum: { amount: true },
        }),
        this.prisma.loanPayment.aggregate({
          where: { userId, accountId: account.id, paidAt: { gt: cutoff } },
          _sum: { amount: true },
        }),
      ]);

    const balanceAsOfCutoff =
      Number(account.initialBalance) -
      Number(expense._sum.amount ?? 0) +
      Number(paymentsIn._sum.amount ?? 0) -
      Number(paymentsOut._sum.amount ?? 0) -
      Number(loansSent._sum.totalAmount ?? 0) +
      Number(loanRepaidAsOf._sum.amount ?? 0);
    const debtAsOfCutoff = balanceAsOfCutoff < 0 ? -balanceAsOfCutoff : 0;

    const creditedAfterCutoff =
      Number(paymentsAfter._sum.amount ?? 0) + Number(loanRepaidAfter._sum.amount ?? 0);

    return Math.max(0, debtAsOfCutoff - creditedAfterCutoff);
  }

  private async withStatementDue<T extends Account>(
    userId: string,
    account: T,
  ): Promise<T & { statementDue: number | null }> {
    if (account.type !== "CREDIT" || !account.billingDate) {
      return { ...account, statementDue: null };
    }
    const statementDue = await this.getStatementDebt(userId, account);
    return { ...account, statementDue };
  }

  private withComputedBalance(
    account: Account,
    movements: MovementTotal[],
    payments: PaymentTotal[],
    loans: LoanTotal[] = [],
    loanPayments: LoanPaymentTotal[] = [],
    paymentsSent: PaymentSentTotal[] = [],
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
    // Using this account/card to pay off ANOTHER card leaves this one too —
    // same idea as a loan, just funding a payment instead of a person.
    const sentToOtherCards = paymentsSent
      .filter((p) => p.sourceAccountId === account.id)
      .reduce((sum, p) => sum + Number(p._sum.amount ?? 0), 0);

    // Card payments reduce debt (increase the balance toward/above zero)
    // exactly like income would, but never flow through the Transaction
    // ledger — a credit card cannot receive "income" (spec: point 5).
    const currentBalance =
      Number(account.initialBalance) +
      income -
      expense +
      totalPayments -
      lent +
      loanRepaid -
      sentToOtherCards;
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
