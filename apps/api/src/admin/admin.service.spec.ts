import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../auth/auth.types";

describe("AdminService.updateUserRole — privilege escalation guards", () => {
  let service: AdminService;
  let prisma: { profile: { findUnique: jest.Mock; update: jest.Mock } };
  let audit: { log: jest.Mock };

  const admin: AuthenticatedUser = { id: "admin-1", email: "a@a.com", role: "ADMIN" };
  const superAdmin: AuthenticatedUser = {
    id: "super-1",
    email: "s@s.com",
    role: "SUPER_ADMIN",
  };

  beforeEach(() => {
    prisma = { profile: { findUnique: jest.fn(), update: jest.fn() } };
    audit = { log: jest.fn() };
    service = new AdminService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
    );
  });

  it("blocks a plain ADMIN from granting the ADMIN role to someone else", async () => {
    prisma.profile.findUnique.mockResolvedValue({ id: "u1", role: "USER" });

    await expect(service.updateUserRole(admin, "u1", "ADMIN")).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.profile.update).not.toHaveBeenCalled();
  });

  it("blocks a plain ADMIN from granting SUPER_ADMIN", async () => {
    prisma.profile.findUnique.mockResolvedValue({ id: "u1", role: "USER" });

    await expect(service.updateUserRole(admin, "u1", "SUPER_ADMIN")).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("lets a plain ADMIN grant SUPPORT / AUDITOR / USER", async () => {
    prisma.profile.findUnique.mockResolvedValue({ id: "u1", role: "USER" });
    prisma.profile.update.mockResolvedValue({ id: "u1", role: "SUPPORT" });

    const result = await service.updateUserRole(admin, "u1", "SUPPORT");

    expect(result.role).toBe("SUPPORT");
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ROLE_CHANGED", actorUserId: "admin-1" }),
    );
  });

  it("lets a SUPER_ADMIN grant the ADMIN role", async () => {
    prisma.profile.findUnique.mockResolvedValue({ id: "u1", role: "USER" });
    prisma.profile.update.mockResolvedValue({ id: "u1", role: "ADMIN" });

    const result = await service.updateUserRole(superAdmin, "u1", "ADMIN");

    expect(result.role).toBe("ADMIN");
  });

  it("blocks changing your own role, even as SUPER_ADMIN", async () => {
    await expect(
      service.updateUserRole(superAdmin, "super-1", "USER"),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.profile.findUnique).not.toHaveBeenCalled();
  });

  it("blocks an ADMIN from touching a SUPER_ADMIN account at all", async () => {
    prisma.profile.findUnique.mockResolvedValue({ id: "u1", role: "SUPER_ADMIN" });

    await expect(service.updateUserRole(admin, "u1", "USER")).rejects.toThrow(
      ForbiddenException,
    );
  });
});
