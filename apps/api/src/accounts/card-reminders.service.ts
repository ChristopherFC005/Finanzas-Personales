import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Account } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { AccountsService } from "./accounts.service";
import { nextOccurrenceOnOrAfter } from "./billing-date.util";

const REMINDER_WINDOW_DAYS = 3;
const STATEMENT_AMOUNT_EPSILON = 0.01;
// One reminder per due-date occurrence: a monthly cycle is at most ~31 days,
// so "not notified in the last 30 days" is enough to dedupe this cycle
// without needing a separate "last reminded" column.
const DEDUPE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class CardRemindersService {
  private readonly logger = new Logger(CardRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkUpcomingDueDates(): Promise<void> {
    const cards = await this.prisma.account.findMany({
      where: {
        type: "CREDIT",
        isActive: true,
        billingDate: { not: null },
        paymentDueDate: { not: null },
      },
    });

    const now = new Date();
    for (const card of cards) {
      try {
        await this.maybeRemindOne(card, now);
      } catch (error) {
        this.logger.error(`Failed to process due-date reminder for account ${card.id}`, error as Error);
      }
    }
  }

  private async maybeRemindOne(card: Account, now: Date): Promise<void> {
    const statementDue = await this.accountsService.getStatementDebt(card.userId, card);
    if (statementDue <= STATEMENT_AMOUNT_EPSILON) return;

    const nextDueDate = nextOccurrenceOnOrAfter(card.paymentDueDate!, now);
    const daysUntilDue = Math.round((nextDueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    if (daysUntilDue < 0 || daysUntilDue > REMINDER_WINDOW_DAYS) return;

    const title = `Pago próximo: ${card.name}`;
    const since = new Date(now.getTime() - DEDUPE_WINDOW_MS);
    if (await this.notifications.alreadyNotifiedSince(card.userId, title, since)) return;

    const when = daysUntilDue === 0 ? "hoy" : daysUntilDue === 1 ? "mañana" : `en ${daysUntilDue} días`;
    const body = `Tu pago de ${card.name} vence ${when}. Debes ${statementDue.toFixed(2)} de este periodo.`;
    await this.notifications.create(card.userId, title, body);
  }
}
