import { Global, Module } from "@nestjs/common";
import { SupabaseAuthGuard } from "./supabase-auth.guard";
import { SupabaseTokenVerifier } from "./supabase-token-verifier";

@Global()
@Module({
  providers: [SupabaseAuthGuard, SupabaseTokenVerifier],
  exports: [SupabaseAuthGuard, SupabaseTokenVerifier],
})
export class AuthModule {}
