import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { StatisticsModule } from "../statistics/statistics.module";
import { AccountsModule } from "../accounts/accounts.module";
import { LoansModule } from "../loans/loans.module";

@Module({
  imports: [StatisticsModule, AccountsModule, LoansModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
