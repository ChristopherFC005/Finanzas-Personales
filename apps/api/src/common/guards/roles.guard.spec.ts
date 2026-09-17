import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";

function contextWithUser(role: string | undefined) {
  const request = { user: role ? { id: "u1", role, email: null } : undefined };
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe("RolesGuard — admin endpoint protection", () => {
  it("denies a regular USER hitting an ADMIN-only route with 403", () => {
    const reflector = { getAllAndOverride: () => ["ADMIN", "SUPER_ADMIN"] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(contextWithUser("USER"))).toThrow(
      ForbiddenException,
    );
  });

  it("allows an ADMIN through", () => {
    const reflector = { getAllAndOverride: () => ["ADMIN", "SUPER_ADMIN"] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(contextWithUser("ADMIN"))).toBe(true);
  });

  it("passes through routes with no @Roles() metadata", () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(contextWithUser("USER"))).toBe(true);
  });
});
