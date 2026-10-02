import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Account, FixedIncome } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PAYMENT_METHOD_BY_ACCOUNT_TYPE } from "../transactions/transactions.service";
import { daysInMonth } from "../accounts/billing-date.util";

@Injectable()
export class FixedIncomesAutomationService {
  private readonly logger = new Logger(FixedIncomesAutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async processDueFixedIncomes(): Promise<void> {
    const incomes = await this.prisma.fixedIncome.findMany({
      where: { isActive: true },
      include: { account: true },
    });

    const now = new Date();
    for (const income of incomes) {
      try {
        await this.maybeCreateOne(income, now);
      } catch (error) {
        this.logger.error(`Failed to process fixed income ${income.id}`, error as Error);
      }
    }
  }

  private async maybeCreateOne(
    income: FixedIncome & { account: Account },
    now: Date,
  ): Promise<void> {
    const triggerDay = Math.min(income.dayOfMonth, daysInMonth(now.getUTCFullYear(), now.getUTCMonth()));
    if (now.getUTCDate() < triggerDay) return;

    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const alreadyCreated = await this.prisma.transaction.findFirst({
      where: { fixedIncomeId: income.id, transactionDate: { gte: startOfMonth }, deletedAt: null },
    });
    if (alreadyCreated) return;

    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    await this.prisma.transaction.create({
      data: {
        userId: income.userId,
        categoryId: income.categoryId,
        accountId: income.accountId,
        fixedIncomeId: income.id,
        type: "INCOME",
        amount: income.amount,
        description: income.name,
        paymentMethod: PAYMENT_METHOD_BY_ACCOUNT_TYPE[income.account.type],
        transactionDate: today,
      },
    });

    await this.notifications.create(
      income.userId,
      "Ingreso fijo recibido",
      `${income.name}: se añadió ${Number(income.amount).toFixed(2)} a ${income.account.name}.`,
    );
  }
}
