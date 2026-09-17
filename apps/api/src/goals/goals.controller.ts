import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/auth.types";
import { GoalsService } from "./goals.service";
import { CreateGoalDto } from "./dto/create-goal.dto";
import { UpdateGoalDto } from "./dto/update-goal.dto";
import { CreateMovementDto } from "./dto/create-movement.dto";

@ApiTags("goals")
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller("goals")
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.goalsService.findAll(user.id);
  }

  @Get(":id")
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.goalsService.findOne(user.id, id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateGoalDto) {
    return this.goalsService.create(user.id, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.goalsService.update(user.id, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.goalsService.remove(user.id, id);
  }

  @Post(":id/deposits")
  deposit(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateMovementDto,
  ) {
    return this.goalsService.deposit(user.id, id, dto);
  }

  @Post(":id/withdrawals")
  withdraw(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateMovementDto,
  ) {
    return this.goalsService.withdraw(user.id, id, dto);
  }
}
