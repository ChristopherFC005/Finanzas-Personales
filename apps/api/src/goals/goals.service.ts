import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateGoalDto } from "./dto/create-goal.dto";
import { UpdateGoalDto } from "./dto/update-goal.dto";
import { CreateMovementDto } from "./dto/create-movement.dto";

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(userId: string, id: string) {
    const goal = await this.prisma.savingsGoal.findFirst({
      where: { id, userId },
      include: { movements: { orderBy: { createdAt: "desc" }, take: 20 } },
    });
    if (!goal) {
      throw new NotFoundException("Meta no encontrada.");
    }
    return goal;
  }

  async create(userId: string, dto: CreateGoalDto) {
    return this.prisma.savingsGoal.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        targetAmount: dto.targetAmount,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateGoalDto) {
    await this.getOwnedOrThrow(userId, id);
    return this.prisma.savingsGoal.update({
      where: { id },
      data: {
        ...dto,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.getOwnedOrThrow(userId, id);
    await this.prisma.savingsGoal.delete({ where: { id } });
  }

  /** Atomic deposit: increments currentAmount and records history in one transaction. */
  async deposit(userId: string, id: string, dto: CreateMovementDto) {
    await this.getOwnedOrThrow(userId, id);

    return this.prisma.$transaction(async (tx) => {
      const goal = await tx.savingsGoal.update({
        where: { id },
        data: { currentAmount: { increment: dto.amount } },
      });

      if (Number(goal.currentAmount) >= Number(goal.targetAmount) && goal.status === "ACTIVE") {
        await tx.savingsGoal.update({
          where: { id },
          data: { status: "COMPLETED" },
        });
      }

      await tx.goalMovement.create({
        data: { goalId: id, userId, type: "DEPOSIT", amount: dto.amount },
      });

      return tx.savingsGoal.findUniqueOrThrow({ where: { id } });
    });
  }

  /**
   * Atomic withdrawal. The balance check and the decrement happen in the
   * same conditional UPDATE so two concurrent withdrawals can never both
   * succeed against insufficient funds (no read-balance-then-write race).
   */
  async withdraw(userId: string, id: string, dto: CreateMovementDto) {
    await this.getOwnedOrThrow(userId, id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.savingsGoal.updateMany({
        where: {
          id,
          userId,
          currentAmount: { gte: dto.amount },
        },
        data: { currentAmount: { decrement: dto.amount } },
      });

      if (updated.count === 0) {
        throw new BadRequestException(
          "Fondos insuficientes para este retiro.",
        );
      }

      await tx.goalMovement.create({
        data: { goalId: id, userId, type: "WITHDRAWAL", amount: dto.amount },
      });

      return tx.savingsGoal.findUniqueOrThrow({ where: { id } });
    });
  }

  private async getOwnedOrThrow(userId: string, id: string) {
    const goal = await this.prisma.savingsGoal.findUnique({ where: { id } });
    if (!goal || goal.userId !== userId) {
      throw new NotFoundException("Meta no encontrada.");
    }
    return goal;
  }
}
