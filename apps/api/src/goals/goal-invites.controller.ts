import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/auth.types";
import { GoalsService } from "./goals.service";

// Separate from GoalsController (whose routes are keyed by goal id) since
// an invite is looked up by an opaque token, not a goal id the requester
// is already known to have access to.
@ApiTags("goal-invites")
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller("goal-invites")
export class GoalInvitesController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get(":token")
  preview(@Param("token") token: string) {
    return this.goalsService.getInvitePreview(token);
  }

  @Post(":token/accept")
  accept(
    @CurrentUser() user: AuthenticatedUser,
    @Param("token") token: string,
  ) {
    return this.goalsService.acceptInvite(user.id, token);
  }
}
