import { UserRole } from "@prisma/client";

/**
 * Identity NestJS trusts for the rest of a request's lifetime, derived
 * exclusively from a verified Supabase access token — never from a
 * client-supplied userId.
 */
export interface AuthenticatedUser {
  id: string; // Supabase auth.users.id (uuid) == profiles.id
  email: string | null;
  role: UserRole;
}
