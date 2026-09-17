import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { paginate } from "../common/pagination/pagination.dto";
import { AuditService, AUDIT_ACTIONS } from "../audit/audit.service";
import { QueryAdminUsersDto } from "./dto/query-admin-users.dto";
import { AuthenticatedUser } from "../auth/auth.types";

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async dashboard() {
    const now = new Date();
    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );

    const [totalUsers, activeUsers, newUsersThisMonth, totalTransactions, recentUsers] =
      await Promise.all([
        this.prisma.profile.count(),
        this.prisma.profile.count({ where: { status: "ACTIVE" } }),
        this.prisma.profile.count({
          where: { createdAt: { gte: startOfMonth } },
        }),
        this.prisma.transaction.count({ where: { deletedAt: null } }),
        this.prisma.profile.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true,
            createdAt: true,
          },
        }),
      ]);

    return {
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      totalTransactions,
      recentUsers,
    };
  }

  async findUsers(query: QueryAdminUsersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ProfileWhereInput = {
      status: query.status,
      OR: query.search
        ? [
            { firstName: { contains: query.search, mode: "insensitive" } },
            { lastName: { contains: query.search, mode: "insensitive" } },
          ]
        : undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.profile.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
          // Never select password hashes — Supabase Auth owns credentials,
          // this table doesn't even have that column.
        },
      }),
      this.prisma.profile.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findUserDetail(id: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        _count: { select: { transactions: true, savingsGoals: true } },
      },
    });
    if (!profile) {
      throw new NotFoundException("Usuario no encontrado.");
    }
    return profile;
  }

  async suspendUser(actor: AuthenticatedUser, id: string, ip?: string) {
    this.assertNotSelf(actor, id);
    const profile = await this.getOrThrow(id);
    if (profile.status === "SUSPENDED") {
      return profile;
    }
    const updated = await this.prisma.profile.update({
      where: { id },
      data: { status: "SUSPENDED" },
    });
    await this.audit.log({
      actorUserId: actor.id,
      action: AUDIT_ACTIONS.USER_SUSPENDED,
      resourceType: "profile",
      resourceId: id,
      ip,
    });
    return updated;
  }

  async reactivateUser(actor: AuthenticatedUser, id: string, ip?: string) {
    const profile = await this.getOrThrow(id);
    if (profile.status === "ACTIVE") {
      return profile;
    }
    const updated = await this.prisma.profile.update({
      where: { id },
      data: { status: "ACTIVE" },
    });
    await this.audit.log({
      actorUserId: actor.id,
      action: AUDIT_ACTIONS.USER_REACTIVATED,
      resourceType: "profile",
      resourceId: id,
      ip,
    });
    return updated;
  }

  async findAuditLogs(query: { page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count(),
    ]);

    return paginate(data, total, page, limit);
  }

  private assertNotSelf(actor: AuthenticatedUser, targetId: string): void {
    if (actor.id === targetId) {
      throw new BadRequestException(
        "No puedes aplicar esta acción sobre tu propia cuenta.",
      );
    }
  }

  private async getOrThrow(id: string) {
    const profile = await this.prisma.profile.findUnique({ where: { id } });
    if (!profile) {
      throw new NotFoundException("Usuario no encontrado.");
    }
    // SUPER_ADMIN accounts are out of reach for regular ADMIN actions —
    // role hierarchy is enforced here, not just hidden in the UI.
    if (profile.role === "SUPER_ADMIN") {
      throw new ForbiddenException(
        "No tienes permisos para modificar esta cuenta.",
      );
    }
    return profile;
  }
}
