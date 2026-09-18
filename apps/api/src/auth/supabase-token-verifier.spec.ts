import { UnauthorizedException } from "@nestjs/common";
import { generateKeyPairSync } from "crypto";
import * as jwt from "jsonwebtoken";
import { SupabaseTokenVerifier } from "./supabase-token-verifier";

const SUPABASE_URL = "https://proj.supabase.co";
const KID = "kid-test-1";

function newKeyPair() {
  return generateKeyPairSync("ec", { namedCurve: "P-256" });
}

function signToken(
  privateKey: ReturnType<typeof newKeyPair>["privateKey"],
  overrides: { kid?: string; expiresIn?: number; issuer?: string } = {},
) {
  return jwt.sign({ sub: "user-1", email: "a@b.com" }, privateKey, {
    algorithm: "ES256",
    keyid: overrides.kid ?? KID,
    issuer: overrides.issuer ?? `${SUPABASE_URL}/auth/v1`,
    expiresIn: overrides.expiresIn ?? 60,
  });
}

describe("SupabaseTokenVerifier (ES256 / JWKS)", () => {
  const pair = newKeyPair();
  let verifier: SupabaseTokenVerifier;

  beforeEach(() => {
    process.env.SUPABASE_URL = SUPABASE_URL;
    delete process.env.SUPABASE_JWT_SECRET;
    verifier = new SupabaseTokenVerifier();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        keys: [{ ...pair.publicKey.export({ format: "jwk" }), kid: KID, alg: "ES256" }],
      }),
    }) as unknown as typeof fetch;
  });

  it("accepts a valid token signed by the project's key", async () => {
    const payload = await verifier.verify(signToken(pair.privateKey));
    expect(payload.sub).toBe("user-1");
  });

  it("rejects a token signed with a different key", async () => {
    const attacker = newKeyPair();
    await expect(verifier.verify(signToken(attacker.privateKey))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("rejects an expired token", async () => {
    const token = signToken(pair.privateKey, { expiresIn: -10 });
    await expect(verifier.verify(token)).rejects.toThrow(UnauthorizedException);
  });

  it("rejects a token from a different issuer", async () => {
    const token = signToken(pair.privateKey, { issuer: "https://evil.example/auth/v1" });
    await expect(verifier.verify(token)).rejects.toThrow(UnauthorizedException);
  });

  it("rejects an unsigned (alg none) token", async () => {
    const token = jwt.sign({ sub: "user-1" }, "", { algorithm: "none" as jwt.Algorithm });
    await expect(verifier.verify(token)).rejects.toThrow(UnauthorizedException);
  });

  it("rejects HS256 tokens when no legacy secret is configured", async () => {
    const token = jwt.sign({ sub: "user-1" }, "attacker-secret", { algorithm: "HS256" });
    await expect(verifier.verify(token)).rejects.toThrow(UnauthorizedException);
  });
});
