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
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/auth.types";
import { TransactionsService } from "./transactions.service";
import { TransactionsExportService } from "./transactions-export.service";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { UpdateTransactionDto } from "./dto/update-transaction.dto";
import { QueryTransactionsDto } from "./dto/query-transactions.dto";
import { ExportTransactionsDto } from "./dto/export-transactions.dto";

@ApiTags("transactions")
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller("transactions")
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly exportService: TransactionsExportService,
  ) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryTransactionsDto,
  ) {
    return this.transactionsService.findAll(user.id, query);
  }

  @Get("export/csv")
  async exportCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ExportTransactionsDto,
    @Res() res: Response,
  ) {
    const transactions = await this.transactionsService.findAllForExport(user.id, query);
    const csv = this.exportService.toCsv(transactions);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="movimientos.csv"');
    res.send(csv);
  }

  @Get("export/pdf")
  async exportPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ExportTransactionsDto,
    @Res() res: Response,
  ) {
    const transactions = await this.transactionsService.findAllForExport(user.id, query);
    const pdf = await this.exportService.toPdf(transactions, query.currency ?? "PEN");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="movimientos.pdf"');
    res.send(pdf);
  }

  @Get(":id")
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.transactionsService.findOne(user.id, id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(user.id, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(user.id, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.transactionsService.remove(user.id, id);
  }
}
