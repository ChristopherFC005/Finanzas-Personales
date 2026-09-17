import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/auth.types";
import { StatisticsService } from "./statistics.service";
import { QueryStatisticsDto } from "./dto/query-statistics.dto";

@ApiTags("statistics")
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller("statistics")
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get("summary")
  summary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryStatisticsDto,
  ) {
    return this.statisticsService.summary(user.id, query);
  }
}
