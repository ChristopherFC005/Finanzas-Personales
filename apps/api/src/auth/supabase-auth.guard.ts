import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import * as jwt from "jsonwebtoken";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "./auth.types";

interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  role?: string;
  exp: number;
}

/**
 * Verifies the Supabase-issued access token on every protected request and
 * resolves the caller's identity + current role/status from our own
 * `profiles` table — never from the token's claims or any client-supplied
 * userId. This is what lets NestJS enforce ownership and RBAC even though
 * Prisma queries do not automatically carry the Postgres RLS auth.uid()
 * context.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("Falta el token de autenticación.");
    }

    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      throw new Error("SUPABASE_JWT_SECRET no está configurado.");
    }

    let payload: SupabaseJwtPayload;
    try {
      payload = jwt.verify(token, secret, {
        algorithms: ["HS256"],
      }) as SupabaseJwtPayload;
    } catch {
      throw new UnauthorizedException("Token inválido o expirado.");
    }

    const profile = await this.prisma.profile.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, status: true },
    });

    if (!profile) {
      throw new UnauthorizedException("Perfil de usuario no encontrado.");
    }

    if (profile.status !== "ACTIVE") {
      throw new UnauthorizedException("La cuenta no está activa.");
    }

    const user: AuthenticatedUser = {
      id: profile.id,
      email: payload.email ?? null,
      role: profile.role,
    };

    (request as Request & { user: AuthenticatedUser }).user = user;
    return true;
  }

  private extractToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return null;
    }
    return header.slice("Bearer ".length).trim() || null;
  }
}
