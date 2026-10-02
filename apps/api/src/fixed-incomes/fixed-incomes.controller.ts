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
import { FixedIncomesService } from "./fixed-incomes.service";
import { CreateFixedIncomeDto } from "./dto/create-fixed-income.dto";
import { UpdateFixedIncomeDto } from "./dto/update-fixed-income.dto";

@ApiTags("fixed-incomes")
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller("fixed-incomes")
export class FixedIncomesController {
  constructor(private readonly fixedIncomesService: FixedIncomesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.fixedIncomesService.findAll(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFixedIncomeDto) {
    return this.fixedIncomesService.create(user.id, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateFixedIncomeDto,
  ) {
    return this.fixedIncomesService.update(user.id, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.fixedIncomesService.remove(user.id, id);
  }
}
