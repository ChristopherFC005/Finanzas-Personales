import { Module } from "@nestjs/common";
import { TransactionsController } from "./transactions.controller";
import { TransactionsService } from "./transactions.service";
import { TransactionsExportService } from "./transactions-export.service";

@Module({
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionsExportService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
