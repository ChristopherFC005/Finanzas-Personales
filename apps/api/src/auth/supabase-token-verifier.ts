import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createPublicKey, KeyObject } from "crypto";
import * as jwt from "jsonwebtoken";

export interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  role?: string;
  exp: number;
}

interface Jwk {
  kid?: string;
  kty: string;
  [key: string]: unknown;
}

const JWKS_TTL_MS = 10 * 60 * 1000;
const JWKS_MIN_REFETCH_MS = 60 * 1000;
const ASYMMETRIC_ALGS: jwt.Algorithm[] = ["ES256", "RS256"];

/**
 * Verifies Supabase access tokens. New Supabase projects sign with an
 * asymmetric key (ES256/RS256) published at /auth/v1/.well-known/jwks.json;
 * legacy projects sign with a shared HS256 secret. Both are supported so the
 * backend keeps working regardless of the project's signing configuration.
 */
@Injectable()
export class SupabaseTokenVerifier {
  private keys = new Map<string, KeyObject>();
  private fetchedAt = 0;

  async verify(token: string): Promise<SupabaseJwtPayload> {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === "string") {
      throw new UnauthorizedException("Token inválido o expirado.");
    }

    const { alg, kid } = decoded.header;
    const supabaseUrl = process.env.SUPABASE_URL;
    const options: jwt.VerifyOptions = {
      issuer: supabaseUrl ? `${supabaseUrl.replace(/\/$/, "")}/auth/v1` : undefined,
    };

    try {
      if (alg === "HS256") {
        const secret = process.env.SUPABASE_JWT_SECRET;
        if (!secret) throw new Error("HS256 no configurado");
        return jwt.verify(token, secret, {
          ...options,
          algorithms: ["HS256"],
        }) as SupabaseJwtPayload;
      }

      if (!ASYMMETRIC_ALGS.includes(alg as jwt.Algorithm) || !kid) {
        throw new Error("Algoritmo no permitido");
      }
      const key = await this.getKey(kid);
      return jwt.verify(token, key, {
        ...options,
        algorithms: [alg as jwt.Algorithm],
      }) as SupabaseJwtPayload;
    } catch {
      throw new UnauthorizedException("Token inválido o expirado.");
    }
  }

  private async getKey(kid: string): Promise<KeyObject> {
    const now = Date.now();
    const stale = now - this.fetchedAt > JWKS_TTL_MS;
    const unknownKid = !this.keys.has(kid);

    if (stale || (unknownKid && now - this.fetchedAt > JWKS_MIN_REFETCH_MS)) {
      await this.refreshKeys();
    }

    const key = this.keys.get(kid);
    if (!key) throw new Error("kid desconocido");
    return key;
  }

  private async refreshKeys(): Promise<void> {
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) throw new Error("SUPABASE_URL no está configurado.");

    const response = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/auth/v1/.well-known/jwks.json`,
    );
    if (!response.ok) throw new Error("No se pudo obtener JWKS");

    const { keys } = (await response.json()) as { keys: Jwk[] };
    const next = new Map<string, KeyObject>();
    for (const jwk of keys) {
      if (jwk.kid) {
        next.set(jwk.kid, createPublicKey({ key: jwk as never, format: "jwk" }));
      }
    }
    this.keys = next;
    this.fetchedAt = Date.now();
  }
}
