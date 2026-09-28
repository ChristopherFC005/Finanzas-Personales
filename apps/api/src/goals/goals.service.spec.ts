import { BadRequestException, NotFoundException } from "@nestjs/common";
import { GoalsService } from "./goals.service";
import { PrismaService } from "../common/prisma/prisma.service";

describe("GoalsService — sharing a goal with another person", () => {
  let service: GoalsService;
  let prisma: {
    savingsGoal: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    goalCollaborator: { findUnique: jest.Mock; create: jest.Mock };
    goalInvite: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    goalMovement: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  const ownedGoal = { id: "goal-1", userId: "owner-1", targetAmount: "1000", currentAmount: "0", status: "ACTIVE" };

  beforeEach(() => {
    prisma = {
      savingsGoal: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      goalCollaborator: { findUnique: jest.fn(), create: jest.fn() },
      goalInvite: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      goalMovement: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    service = new GoalsService(prisma as unknown as PrismaService);
  });

  describe("createInvite", () => {
    it("rejects a collaborator (or anyone else) trying to invite someone — owner only", async () => {
      prisma.savingsGoal.findUnique.mockResolvedValue(ownedGoal);

      await expect(service.createInvite("collaborator-1", "goal-1")).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.goalInvite.create).not.toHaveBeenCalled();
    });

    it("lets the owner create an invite", async () => {
      prisma.savingsGoal.findUnique.mockResolvedValue(ownedGoal);
      prisma.goalInvite.create.mockResolvedValue({});

      const result = await service.createInvite("owner-1", "goal-1");

      expect(prisma.goalInvite.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ goalId: "goal-1", createdByUserId: "owner-1" }),
        }),
      );
      expect(result.token).toEqual(expect.any(String));
      expect(result.url).toContain(result.token);
    });
  });

  describe("getInvitePreview", () => {
    it("throws for a missing invite", async () => {
      prisma.goalInvite.findUnique.mockResolvedValue(null);
      await expect(service.getInvitePreview("bad-token")).rejects.toThrow(NotFoundException);
    });

    it("throws for an already-accepted invite", async () => {
      prisma.goalInvite.findUnique.mockResolvedValue({ status: "ACCEPTED" });
      await expect(service.getInvitePreview("used-token")).rejects.toThrow(NotFoundException);
    });

    it("returns the goal summary for a pending invite", async () => {
      prisma.goalInvite.findUnique.mockResolvedValue({
        status: "PENDING",
        goal: { name: "Viaje a Cusco", targetAmount: "1000", currentAmount: "200" },
        createdBy: { firstName: "Ana", lastName: "Lopez" },
      });

      const preview = await service.getInvitePreview("good-token");

      expect(preview).toEqual({
        goalName: "Viaje a Cusco",
        targetAmount: "1000",
        currentAmount: "200",
        invitedByName: "Ana Lopez",
      });
    });
  });

  describe("acceptInvite", () => {
    const pendingInvite = { id: "invite-1", goalId: "goal-1", createdByUserId: "owner-1", status: "PENDING" };

    it("rejects the goal owner accepting their own invite", async () => {
      prisma.goalInvite.findUnique.mockResolvedValue(pendingInvite);

      await expect(service.acceptInvite("owner-1", "tok")).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("rejects accepting a non-pending or missing invite", async () => {
      prisma.goalInvite.findUnique.mockResolvedValue(null);
      await expect(service.acceptInvite("friend-1", "tok")).rejects.toThrow(NotFoundException);

      prisma.goalInvite.findUnique.mockResolvedValue({ ...pendingInvite, status: "ACCEPTED" });
      await expect(service.acceptInvite("friend-1", "tok")).rejects.toThrow(NotFoundException);
    });

    it("rejects if the invitee is already a collaborator on this goal", async () => {
      prisma.goalInvite.findUnique.mockResolvedValue(pendingInvite);
      prisma.goalCollaborator.findUnique.mockResolvedValue({ id: "existing" });

      await expect(service.acceptInvite("friend-1", "tok")).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("creates the collaborator and marks the invite accepted", async () => {
      prisma.goalInvite.findUnique.mockResolvedValue(pendingInvite);
      prisma.goalCollaborator.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockResolvedValue([{}, {}]);
      prisma.savingsGoal.findFirst.mockResolvedValue({ ...ownedGoal, movements: [], collaborators: [] });

      await service.acceptInvite("friend-1", "tok");

      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Array));
      expect(prisma.goalCollaborator.create).toHaveBeenCalledWith({
        data: { goalId: "goal-1", userId: "friend-1", invitedByUserId: "owner-1" },
      });
      expect(prisma.goalInvite.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "invite-1" },
          data: expect.objectContaining({ status: "ACCEPTED", acceptedByUserId: "friend-1" }),
        }),
      );
    });
  });

  describe("access control for deposits/withdrawals", () => {
    it("lets a collaborator deposit into a goal they don't own", async () => {
      prisma.savingsGoal.findFirst.mockResolvedValue(ownedGoal);
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
        const tx = {
          savingsGoal: {
            update: jest.fn().mockResolvedValue({ ...ownedGoal, currentAmount: "100" }),
            findUniqueOrThrow: jest.fn().mockResolvedValue({ ...ownedGoal, currentAmount: "100" }),
          },
          goalMovement: { create: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

      await service.deposit("collaborator-1", "goal-1", { amount: "100" } as never);

      expect(prisma.savingsGoal.findFirst).toHaveBeenCalledWith({
        where: { id: "goal-1", OR: [{ userId: "collaborator-1" }, { collaborators: { some: { userId: "collaborator-1" } } }] },
      });
    });

    it("rejects deposits from someone who isn't the owner or a collaborator", async () => {
      prisma.savingsGoal.findFirst.mockResolvedValue(null);

      await expect(
        service.deposit("stranger-1", "goal-1", { amount: "100" } as never),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe("access control for editing/deleting", () => {
    it("rejects a collaborator trying to update the goal — owner only", async () => {
      prisma.savingsGoal.findUnique.mockResolvedValue(ownedGoal);

      await expect(
        service.update("collaborator-1", "goal-1", { name: "Nuevo nombre" } as never),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.savingsGoal.update).not.toHaveBeenCalled();
    });

    it("rejects a collaborator trying to delete the goal — owner only", async () => {
      prisma.savingsGoal.findUnique.mockResolvedValue(ownedGoal);

      await expect(service.remove("collaborator-1", "goal-1")).rejects.toThrow(NotFoundException);
    });
  });
});
