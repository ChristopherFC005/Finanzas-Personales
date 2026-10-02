import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Used by other modules (goals, card reminders) to notify a user — never called from a controller directly. */
  async create(userId: string, title: string, body?: string): Promise<void> {
    await this.prisma.notification.create({ data: { userId, title, body } });
  }

  async findAll(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, id: string): Promise<void> {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException("Notificación no encontrada.");
    }
    if (notification.readAt) return;
    await this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  /**
   * Avoids re-notifying for the same cycle: true if a notification whose
   * title matches `titleMarker` was already created for this user at or
   * after `since` (the start of the current billing/due cycle).
   */
  async alreadyNotifiedSince(userId: string, titleMarker: string, since: Date): Promise<boolean> {
    const existing = await this.prisma.notification.findFirst({
      where: { userId, title: titleMarker, createdAt: { gte: since } },
    });
    return existing !== null;
  }
}
