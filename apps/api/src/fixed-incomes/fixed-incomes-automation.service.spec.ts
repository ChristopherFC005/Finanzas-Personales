import { FixedIncomesAutomationService } from "./fixed-incomes-automation.service";
import { PrismaService } from "../common/prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

describe("FixedIncomesAutomationService", () => {
  let service: FixedIncomesAutomationService;
  let prisma: {
    fixedIncome: { findMany: jest.Mock };
    transaction: { findFirst: jest.Mock; create: jest.Mock };
  };
  let notifications: { create: jest.Mock };

  const baseIncome = {
    id: "fi-1",
    userId: "u1",
    categoryId: "cat-1",
    accountId: "acc-1",
    name: "Sueldo",
    amount: "2500",
    isActive: true,
    account: { id: "acc-1", name: "BCP", type: "DEBIT" as const },
  };

  beforeEach(() => {
    prisma = {
      fixedIncome: { findMany: jest.fn() },
      transaction: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) },
    };
    notifications = { create: jest.fn().mockResolvedValue(undefined) };
    service = new FixedIncomesAutomationService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
  });

  function withSystemDate(date: string, fn: () => Promise<void>) {
    jest.useFakeTimers().setSystemTime(new Date(date));
    return fn().finally(() => jest.useRealTimers());
  }

  it("creates the income transaction once the trigger day has arrived", async () => {
    const income = { ...baseIncome, dayOfMonth: 5 };
    prisma.fixedIncome.findMany.mockResolvedValue([income]);

    await withSystemDate("2026-03-05T09:00:00.000Z", () => service.processDueFixedIncomes());

    expect(prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fixedIncomeId: "fi-1",
          type: "INCOME",
          amount: "2500",
          accountId: "acc-1",
          paymentMethod: "DEBIT",
        }),
      }),
    );
    expect(notifications.create).toHaveBeenCalledWith("u1", "Ingreso fijo recibido", expect.stringContaining("BCP"));
  });

  it("does not create it before the trigger day", async () => {
    const income = { ...baseIncome, dayOfMonth: 20 };
    prisma.fixedIncome.findMany.mockResolvedValue([income]);

    await withSystemDate("2026-03-05T09:00:00.000Z", () => service.processDueFixedIncomes());

    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it("does not create a duplicate when one was already generated this month", async () => {
    const income = { ...baseIncome, dayOfMonth: 5 };
    prisma.fixedIncome.findMany.mockResolvedValue([income]);
    prisma.transaction.findFirst.mockResolvedValue({ id: "existing-tx" });

    await withSystemDate("2026-03-06T09:00:00.000Z", () => service.processDueFixedIncomes());

    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it("catches up a missed day within the month (e.g. day 31 clamped on a 30-day month)", async () => {
    const income = { ...baseIncome, dayOfMonth: 31 };
    prisma.fixedIncome.findMany.mockResolvedValue([income]);

    // April has 30 days, so day 31 clamps to the 30th.
    await withSystemDate("2026-04-30T09:00:00.000Z", () => service.processDueFixedIncomes());

    expect(prisma.transaction.create).toHaveBeenCalled();
  });

  it("keeps processing other incomes when one throws", async () => {
    const bad = { ...baseIncome, id: "fi-bad", dayOfMonth: 1 };
    const good = { ...baseIncome, id: "fi-good", dayOfMonth: 1 };
    prisma.fixedIncome.findMany.mockResolvedValue([bad, good]);
    prisma.transaction.findFirst.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(null);

    await withSystemDate("2026-03-05T09:00:00.000Z", () => service.processDueFixedIncomes());

    expect(prisma.transaction.create).toHaveBeenCalledTimes(1);
    expect(prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ fixedIncomeId: "fi-good" }) }),
    );
  });
});
