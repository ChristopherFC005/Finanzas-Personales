import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Loan } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateLoanDto } from "./dto/create-loan.dto";
import { UpdateLoanDto } from "./dto/update-loan.dto";
import { CreateLoanPaymentDto } from "./dto/create-loan-payment.dto";

@Injectable()
export class LoansService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const loans = await this.prisma.loan.findMany({
      where: { userId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    if (loans.length === 0) return [];

    const sums = await this.prisma.loanPayment.groupBy({
      by: ["loanId"],
      where: { userId, loanId: { in: loans.map((l) => l.id) } },
      _sum: { amount: true },
    });

    return loans.map((loan) => this.withComputed(loan, sums));
  }

  async findOne(userId: string, id: string) {
    const loan = await this.getOwnedOrThrow(userId, id);
    const [sums, payments] = await Promise.all([
      this.prisma.loanPayment.groupBy({
        by: ["loanId"],
        where: { userId, loanId: id },
        _sum: { amount: true },
      }),
      this.prisma.loanPayment.findMany({
        where: { loanId: id },
        orderBy: { paidAt: "desc" },
        take: 20,
      }),
    ]);
    return { ...this.withComputed(loan, sums), payments };
  }

  async create(userId: string, dto: CreateLoanDto) {
    this.assertScheduleValid(dto);
    const loan = await this.prisma.loan.create({
      data: {
        userId,
        borrowerName: dto.borrowerName,
        totalAmount: dto.totalAmount,
        paymentType: dto.paymentType,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        installmentsCount: dto.installmentsCount,
        firstDueDate: dto.firstDueDate ? new Date(dto.firstDueDate) : undefined,
        notes: dto.notes,
      },
    });
    return this.withComputed(loan, []);
  }

  async update(userId: string, id: string, dto: UpdateLoanDto) {
    await this.getOwnedOrThrow(userId, id);
    if (dto.paymentType) {
      this.assertScheduleValid(dto as CreateLoanDto);
    }
    await this.prisma.loan.update({
      where: { id },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        firstDueDate: dto.firstDueDate ? new Date(dto.firstDueDate) : undefined,
      },
    });
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.getOwnedOrThrow(userId, id);
    await this.prisma.loan.delete({ where: { id } });
  }

  /** Atomic: records the payment and flips status to PAID once fully covered. */
  async registerPayment(userId: string, id: string, dto: CreateLoanPaymentDto) {
    const loan = await this.getOwnedOrThrow(userId, id);
    if (loan.status !== "ACTIVE") {
      throw new BadRequestException("Este préstamo ya no está activo.");
    }

    // Keep the interactive transaction to the minimum atomic write (record
    // the payment, flip status once fully covered) — building the response
    // is read-only and doesn't need transactional isolation, and folding it
    // in here was pushing the transaction over Prisma's pooled-connection
    // time budget and getting it killed mid-flight.
    await this.prisma.$transaction(async (tx) => {
      await tx.loanPayment.create({
        data: { loanId: id, userId, amount: dto.amount },
      });

      const sum = await tx.loanPayment.aggregate({
        where: { loanId: id },
        _sum: { amount: true },
      });
      const received = Number(sum._sum.amount ?? 0);

      if (received >= Number(loan.totalAmount)) {
        await tx.loan.update({ where: { id }, data: { status: "PAID" } });
      }
    });

    return this.findOne(userId, id);
  }

  private assertScheduleValid(dto: CreateLoanDto): void {
    if (dto.paymentType === "SINGLE" && !dto.dueDate) {
      throw new BadRequestException(
        "Indica la fecha en que te deben pagar.",
      );
    }
    if (
      dto.paymentType === "INSTALLMENTS" &&
      (!dto.installmentsCount || !dto.firstDueDate)
    ) {
      throw new BadRequestException(
        "Indica el número de cuotas y la fecha del primer pago.",
      );
    }
  }

  private async getOwnedOrThrow(userId: string, id: string): Promise<Loan> {
    const loan = await this.prisma.loan.findUnique({ where: { id } });
    if (!loan || loan.userId !== userId) {
      throw new NotFoundException("Préstamo no encontrado.");
    }
    return loan;
  }

  private withComputed(
    loan: Loan,
    sums: { loanId: string; _sum: { amount: unknown } }[],
  ) {
    const received = Number(
      sums.find((s) => s.loanId === loan.id)?._sum.amount ?? 0,
    );
    const total = Number(loan.totalAmount);
    const remaining = Math.max(0, total - received);

    let nextDueDate: Date | null = null;
    if (loan.status === "ACTIVE") {
      if (loan.paymentType === "SINGLE") {
        nextDueDate = loan.dueDate;
      } else if (loan.firstDueDate && loan.installmentsCount) {
        const installmentAmount = total / loan.installmentsCount;
        const periodsElapsed = Math.min(
          loan.installmentsCount - 1,
          Math.floor(received / installmentAmount),
        );
        nextDueDate = new Date(loan.firstDueDate);
        nextDueDate.setUTCMonth(nextDueDate.getUTCMonth() + periodsElapsed);
      }
    }

    const isOverdue =
      loan.status === "ACTIVE" &&
      nextDueDate !== null &&
      nextDueDate.getTime() < Date.now();

    return {
      ...loan,
      amountReceived: received,
      remaining,
      nextDueDate,
      isOverdue,
    };
  }
}
