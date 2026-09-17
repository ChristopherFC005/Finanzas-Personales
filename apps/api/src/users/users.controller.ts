import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/auth.types";
import { UsersService } from "./users.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UpdatePreferencesDto } from "./dto/update-preferences.dto";

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMe(user.id);
  }

  @Patch("me")
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateMe(user.id, dto);
  }

  @Get("me/preferences")
  getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getPreferences(user.id);
  }

  @Patch("me/preferences")
  updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.usersService.updatePreferences(user.id, dto);
  }
}
