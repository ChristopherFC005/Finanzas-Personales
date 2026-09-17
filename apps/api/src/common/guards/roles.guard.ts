import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { UserRole } from "@prisma/client";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { AuthenticatedUser } from "../../auth/auth.types";

/**
 * RBAC check. Must run AFTER SupabaseAuthGuard, which populates request.user
 * from a verified token + a live DB lookup — never from client input.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedUser }>();
    const user = request.user;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        "No tienes permisos para acceder a este recurso.",
      );
    }

    return true;
  }
}
