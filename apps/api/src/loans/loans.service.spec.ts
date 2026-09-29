import { BadRequestException, NotFoundException } from "@nestjs/common";
import { LoansService } from "./loans.service";
import { PrismaService } from "../common/prisma/prisma.service";

describe("LoansService", () => {
  let service: LoansService;
  let prisma: {
    loan: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    loanPayment: {
      groupBy: jest.Mock;
      create: jest.Mock;
      aggregate: jest.Mock;
      findMany: jest.Mock;
    };
    account: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      loan: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      loanPayment: {
        groupBy: jest.fn(),
        create: jest.fn(),
        aggregate: jest.fn(),
        findMany: jest.fn(),
      },
      account: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };
    service = new LoansService(prisma as unknown as PrismaService);
  });

  describe("ownership isolation", () => {
    it("does not let user B fetch user A's loan", async () => {
      prisma.loan.findUnique.mockResolvedValue({ id: "loan-1", userId: "user-a" });

      await expect(service.findOne("user-b", "loan-1")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("schedule validation", () => {
    it("rejects SINGLE without a dueDate", async () => {
      await expect(
        service.create("u1", {
          borrowerName: "Juan",
          totalAmount: "100",
          paymentType: "SINGLE",
        } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects INSTALLMENTS without count + first due date", async () => {
      await expect(
        service.create("u1", {
          borrowerName: "Juan",
          totalAmount: "100",
          paymentType: "INSTALLMENTS",
        } as never),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("funding account ownership", () => {
    it("rejects creating a loan against an account owned by another user", async () => {
      prisma.account.findUnique.mockResolvedValue({ id: "acc-1", userId: "user-b" });

      await expect(
        service.create("user-a", {
          borrowerName: "Juan",
          totalAmount: "100",
          paymentType: "SINGLE",
          dueDate: "2026-01-01",
          accountId: "acc-1",
        } as never),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.loan.create).not.toHaveBeenCalled();
    });

    it("rejects creating a loan against a non-existent account", async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(
        service.create("user-a", {
          borrowerName: "Juan",
          totalAmount: "100",
          paymentType: "SINGLE",
          dueDate: "2026-01-01",
          accountId: "acc-missing",
        } as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("external loans (already lent outside the app)", () => {
    it("persists isExternal: true so the funding account isn't debited", async () => {
      prisma.account.findUnique.mockResolvedValue({ id: "acc-1", userId: "u1" });
      prisma.loan.create.mockResolvedValue({
        id: "loan-1",
        userId: "u1",
        totalAmount: "500",
        accountId: "acc-1",
        isExternal: true,
        status: "ACTIVE",
      });

      await service.create("u1", {
        borrowerName: "Juan",
        totalAmount: "500",
        paymentType: "SINGLE",
        dueDate: "2026-01-01",
        accountId: "acc-1",
        isExternal: true,
      } as never);

      expect(prisma.loan.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isExternal: true }) }),
      );
    });

    it("defaults isExternal to false when omitted", async () => {
      prisma.account.findUnique.mockResolvedValue({ id: "acc-1", userId: "u1" });
      prisma.loan.create.mockResolvedValue({
        id: "loan-1",
        userId: "u1",
        totalAmount: "500",
        accountId: "acc-1",
        isExternal: false,
        status: "ACTIVE",
      });

      await service.create("u1", {
        borrowerName: "Juan",
        totalAmount: "500",
        paymentType: "SINGLE",
        dueDate: "2026-01-01",
        accountId: "acc-1",
      } as never);

      expect(prisma.loan.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isExternal: false }) }),
      );
    });
  });

  describe("registering a repayment credits the funding account", () => {
    it("copies the loan's accountId onto the created LoanPayment", async () => {
      const loan = {
        id: "loan-1",
        userId: "u1",
        status: "ACTIVE",
        totalAmount: "300",
        accountId: "acc-1",
      };
      prisma.loan.findUnique.mockResolvedValue(loan);
      prisma.loanPayment.groupBy.mockResolvedValue([]);
      prisma.loanPayment.findMany.mockResolvedValue([]);

      const tx = {
        loanPayment: {
          create: jest.fn().mockResolvedValue({}),
        },
        loan: { update: jest.fn() },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tx.loanPayment as any).aggregate = jest
        .fn()
        .mockResolvedValue({ _sum: { amount: 100 } });
      prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(tx));

      await service.registerPayment("u1", "loan-1", { amount: "100" } as never);

      expect(tx.loanPayment.create).toHaveBeenCalledWith({
        data: { loanId: "loan-1", userId: "u1", amount: "100", accountId: "acc-1" },
      });
    });
  });

  describe("next due date for installments with uneven payments", () => {
    it("advances the due month proportionally to how much was actually paid", () => {
      // 300 total over 3 installments of 100 each, starting 2026-01-15.
      // withComputed is private, so we exercise it indirectly via findOne.
      const loan = {
        id: "loan-1",
        userId: "u1",
        borrowerName: "Ana",
        totalAmount: "300" as unknown as number,
        paymentType: "INSTALLMENTS",
        status: "ACTIVE",
        dueDate: null,
        installmentsCount: 3,
        firstDueDate: new Date("2026-01-15T00:00:00.000Z"),
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      // Access the private method through the instance for a focused unit test.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const withComputed = (service as any).withComputed.bind(service);

      // Paid 150 (one and a half installments) -> should be on period 1 (Feb).
      const result = withComputed(loan, [
        { loanId: "loan-1", _sum: { amount: 150 } },
      ]);

      expect(result.remaining).toBe(150);
      expect(result.nextDueDate.getUTCMonth()).toBe(1); // February (0-indexed)
    });

    it("marks a loan overdue when the next due date is in the past", () => {
      const loan = {
        id: "loan-1",
        userId: "u1",
        borrowerName: "Ana",
        totalAmount: "100" as unknown as number,
        paymentType: "SINGLE",
        status: "ACTIVE",
        dueDate: new Date("2020-01-01T00:00:00.000Z"),
        installmentsCount: null,
        firstDueDate: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const withComputed = (service as any).withComputed.bind(service);
      const result = withComputed(loan, []);

      expect(result.isOverdue).toBe(true);
    });
  });
});
