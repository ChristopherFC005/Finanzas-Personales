import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";

export interface AuditEntry {
  actorUserId: string | null;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}

/** Sensitive administrative actions worth a permanent audit trail. */
export const AUDIT_ACTIONS = {
  USER_SUSPENDED: "USER_SUSPENDED",
  USER_REACTIVATED: "USER_REACTIVATED",
  ROLE_CHANGED: "ROLE_CHANGED",
  ADMIN_LOGIN: "ADMIN_LOGIN",
  ADMIN_SETTING_CHANGED: "ADMIN_SETTING_CHANGED",
} as const;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Never pass secrets (passwords, tokens) in `metadata`. */
  async log(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: entry.actorUserId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        metadata: entry.metadata as never,
        ip: entry.ip,
      },
    });
  }
}
