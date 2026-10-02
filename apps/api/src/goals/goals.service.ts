import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes } from "crypto";
import { PrismaService } from "../common/prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateGoalDto } from "./dto/create-goal.dto";
import { UpdateGoalDto } from "./dto/update-goal.dto";
import { CreateMovementDto } from "./dto/create-movement.dto";

const COLLABORATOR_SELECT = {
  id: true,
  userId: true,
  user: { select: { id: true, firstName: true, lastName: true } },
};

@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll(userId: string) {
    const goals = await this.prisma.savingsGoal.findMany({
      where: { OR: [{ userId }, { collaborators: { some: { userId } } }] },
      include: { collaborators: { select: COLLABORATOR_SELECT } },
      orderBy: { createdAt: "desc" },
    });
    return goals.map((goal) => ({ ...goal, isOwner: goal.userId === userId }));
  }

  async findOne(userId: string, id: string) {
    const goal = await this.prisma.savingsGoal.findFirst({
      where: { id, OR: [{ userId }, { collaborators: { some: { userId } } }] },
      include: {
        movements: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        collaborators: { select: COLLABORATOR_SELECT },
      },
    });
    if (!goal) {
      throw new NotFoundException("Meta no encontrada.");
    }
    return { ...goal, isOwner: goal.userId === userId };
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
    await this.getAccessibleOrThrow(userId, id);

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
    }).then(async (goal) => {
      await this.notifyOthersOfMovement(userId, goal, "DEPOSIT", dto.amount);
      return goal;
    });
  }

  /**
   * Atomic withdrawal. The balance check and the decrement happen in the
   * same conditional UPDATE so two concurrent withdrawals can never both
   * succeed against insufficient funds (no read-balance-then-write race).
   */
  async withdraw(userId: string, id: string, dto: CreateMovementDto) {
    await this.getAccessibleOrThrow(userId, id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.savingsGoal.updateMany({
        where: {
          id,
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
    }).then(async (goal) => {
      await this.notifyOthersOfMovement(userId, goal, "WITHDRAWAL", dto.amount);
      return goal;
    });
  }

  /** Only the goal's creator can invite someone else to it — a single-use link. */
  async createInvite(userId: string, goalId: string) {
    await this.getOwnedOrThrow(userId, goalId);

    const token = randomBytes(24).toString("base64url");
    await this.prisma.goalInvite.create({
      data: { goalId, token, createdByUserId: userId },
    });

    const baseUrl = (process.env.FRONTEND_URL ?? "").replace(/\/$/, "");
    return { token, url: `${baseUrl}/dashboard/goals/join/${token}` };
  }

  /** Read-only preview shown before the invitee decides to accept. */
  async getInvitePreview(token: string) {
    const invite = await this.prisma.goalInvite.findUnique({
      where: { token },
      include: {
        goal: { select: { name: true, targetAmount: true, currentAmount: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!invite || invite.status !== "PENDING") {
      throw new NotFoundException("Esta invitación ya no está disponible.");
    }
    return {
      goalName: invite.goal.name,
      targetAmount: invite.goal.targetAmount,
      currentAmount: invite.goal.currentAmount,
      invitedByName: `${invite.createdBy.firstName} ${invite.createdBy.lastName}`.trim(),
    };
  }

  async acceptInvite(userId: string, token: string) {
    const invite = await this.prisma.goalInvite.findUnique({ where: { token } });
    if (!invite || invite.status !== "PENDING") {
      throw new NotFoundException("Esta invitación ya no está disponible.");
    }
    if (invite.createdByUserId === userId) {
      throw new BadRequestException("No puedes aceptar tu propia invitación.");
    }

    const alreadyCollaborator = await this.prisma.goalCollaborator.findUnique({
      where: { goalId_userId: { goalId: invite.goalId, userId } },
    });
    if (alreadyCollaborator) {
      throw new BadRequestException("Ya colaboras en esta meta.");
    }

    await this.prisma.$transaction([
      this.prisma.goalCollaborator.create({
        data: { goalId: invite.goalId, userId, invitedByUserId: invite.createdByUserId },
      }),
      this.prisma.goalInvite.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED", acceptedByUserId: userId, acceptedAt: new Date() },
      }),
    ]);

    return this.findOne(userId, invite.goalId);
  }

  /**
   * Tells every OTHER participant (owner + collaborators, minus whoever
   * just acted) that money moved in a shared goal — so a collaborator
   * finds out their co-saver deposited without having to reopen the page.
   * Best-effort: runs after the movement is already committed, so a
   * notification failure never blocks the deposit/withdrawal itself.
   */
  private async notifyOthersOfMovement(
    actorUserId: string,
    goal: { id: string; userId: string; name: string },
    type: "DEPOSIT" | "WITHDRAWAL",
    amount: string,
  ): Promise<void> {
    const [collaborators, actor] = await Promise.all([
      this.prisma.goalCollaborator.findMany({
        where: { goalId: goal.id },
        select: { userId: true },
      }),
      this.prisma.profile.findUnique({
        where: { id: actorUserId },
        select: { firstName: true, lastName: true },
      }),
    ]);

    const recipients = new Set([goal.userId, ...collaborators.map((c) => c.userId)]);
    recipients.delete(actorUserId);
    if (recipients.size === 0) return;

    const actorName = actor ? `${actor.firstName} ${actor.lastName}`.trim() : "Alguien";
    const verb = type === "DEPOSIT" ? "aportó" : "retiró";
    const title = "Movimiento en meta compartida";
    const body = `${actorName} ${verb} S/ ${amount} en "${goal.name}".`;

    await Promise.all(
      [...recipients].map((recipientId) => this.notifications.create(recipientId, title, body)),
    );
  }

  /** Strict ownership — for editing, deleting, or inviting to a goal. */
  private async getOwnedOrThrow(userId: string, id: string) {
    const goal = await this.prisma.savingsGoal.findUnique({ where: { id } });
    if (!goal || goal.userId !== userId) {
      throw new NotFoundException("Meta no encontrada.");
    }
    return goal;
  }

  /** Owner OR an accepted collaborator — for viewing/depositing/withdrawing. */
  private async getAccessibleOrThrow(userId: string, id: string) {
    const goal = await this.prisma.savingsGoal.findFirst({
      where: { id, OR: [{ userId }, { collaborators: { some: { userId } } }] },
    });
    if (!goal) {
      throw new NotFoundException("Meta no encontrada.");
    }
    return goal;
  }
}
