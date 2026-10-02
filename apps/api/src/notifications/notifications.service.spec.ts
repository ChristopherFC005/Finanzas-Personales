import { NotFoundException } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { PrismaService } from "../common/prisma/prisma.service";

describe("NotificationsService", () => {
  let service: NotificationsService;
  let prisma: {
    notification: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    service = new NotificationsService(prisma as unknown as PrismaService);
  });

  describe("ownership isolation", () => {
    it("does not let user B mark user A's notification as read", async () => {
      prisma.notification.findUnique.mockResolvedValue({ id: "n1", userId: "user-a", readAt: null });

      await expect(service.markRead("user-b", "n1")).rejects.toThrow(NotFoundException);
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });

    it("is a no-op when the notification is already read", async () => {
      prisma.notification.findUnique.mockResolvedValue({ id: "n1", userId: "u1", readAt: new Date() });

      await service.markRead("u1", "n1");

      expect(prisma.notification.update).not.toHaveBeenCalled();
    });
  });

  describe("alreadyNotifiedSince", () => {
    it("returns true when a matching notification already exists since the given date", async () => {
      prisma.notification.findFirst.mockResolvedValue({ id: "n1" });

      const result = await service.alreadyNotifiedSince("u1", "Card due reminder", new Date("2026-01-01"));

      expect(result).toBe(true);
    });

    it("returns false when no matching notification exists", async () => {
      prisma.notification.findFirst.mockResolvedValue(null);

      const result = await service.alreadyNotifiedSince("u1", "Card due reminder", new Date("2026-01-01"));

      expect(result).toBe(false);
    });
  });
});
