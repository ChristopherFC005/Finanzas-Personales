import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/auth.types";
import { AiService } from "./ai.service";
import { AskAssistantDto } from "./dto/ask-assistant.dto";

@ApiTags("assistant")
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller("assistant")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @Post("ask")
  ask(@CurrentUser() user: AuthenticatedUser, @Body() dto: AskAssistantDto) {
    return this.aiService.ask(user.id, dto);
  }
}
