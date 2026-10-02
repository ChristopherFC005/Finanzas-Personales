import { CardRemindersService } from "./card-reminders.service";
import { PrismaService } from "../common/prisma/prisma.service";
import { AccountsService } from "./accounts.service";
import { NotificationsService } from "../notifications/notifications.service";

describe("CardRemindersService", () => {
  let service: CardRemindersService;
  let prisma: { account: { findMany: jest.Mock } };
  let accountsService: { getStatementDebt: jest.Mock };
  let notifications: { alreadyNotifiedSince: jest.Mock; create: jest.Mock };

  const baseCard = {
    id: "card-1",
    userId: "u1",
    name: "Visa Oro",
    type: "CREDIT" as const,
    isActive: true,
    billingDate: new Date("2026-01-10T00:00:00.000Z"),
  };

  beforeEach(() => {
    prisma = { account: { findMany: jest.fn() } };
    accountsService = { getStatementDebt: jest.fn() };
    notifications = {
      alreadyNotifiedSince: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue(undefined),
    };
    service = new CardRemindersService(
      prisma as unknown as PrismaService,
      accountsService as unknown as AccountsService,
      notifications as unknown as NotificationsService,
    );
  });

  function dueInDays(days: number): Date {
    const now = new Date();
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }

  it("sends a reminder when the due date is within the window and there's unpaid debt", async () => {
    const card = { ...baseCard, paymentDueDate: dueInDays(2) };
    prisma.account.findMany.mockResolvedValue([card]);
    accountsService.getStatementDebt.mockResolvedValue(250);

    await service.checkUpcomingDueDates();

    expect(notifications.create).toHaveBeenCalledTimes(1);
    expect(notifications.create).toHaveBeenCalledWith(
      "u1",
      "Pago próximo: Visa Oro",
      expect.stringContaining("250.00"),
    );
  });

  it("does not remind when there is nothing owed this statement", async () => {
    const card = { ...baseCard, paymentDueDate: dueInDays(1) };
    prisma.account.findMany.mockResolvedValue([card]);
    accountsService.getStatementDebt.mockResolvedValue(0);

    await service.checkUpcomingDueDates();

    expect(notifications.create).not.toHaveBeenCalled();
  });

  it("does not remind when the due date is further away than the reminder window", async () => {
    const card = { ...baseCard, paymentDueDate: dueInDays(10) };
    prisma.account.findMany.mockResolvedValue([card]);
    accountsService.getStatementDebt.mockResolvedValue(250);

    await service.checkUpcomingDueDates();

    expect(notifications.create).not.toHaveBeenCalled();
  });

  it("does not send a duplicate reminder within the same cycle", async () => {
    const card = { ...baseCard, paymentDueDate: dueInDays(0) };
    prisma.account.findMany.mockResolvedValue([card]);
    accountsService.getStatementDebt.mockResolvedValue(250);
    notifications.alreadyNotifiedSince.mockResolvedValue(true);

    await service.checkUpcomingDueDates();

    expect(notifications.create).not.toHaveBeenCalled();
  });

  it("keeps processing other cards when one card's lookup throws", async () => {
    const goodCard = { ...baseCard, id: "card-2", name: "Mastercard", paymentDueDate: dueInDays(1) };
    const badCard = { ...baseCard, id: "card-1", paymentDueDate: dueInDays(1) };
    prisma.account.findMany.mockResolvedValue([badCard, goodCard]);
    accountsService.getStatementDebt
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(100);

    await service.checkUpcomingDueDates();

    expect(notifications.create).toHaveBeenCalledWith(
      "u1",
      "Pago próximo: Mastercard",
      expect.any(String),
    );
  });
});
