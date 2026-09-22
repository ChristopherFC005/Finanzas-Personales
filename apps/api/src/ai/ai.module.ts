import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { StatisticsModule } from "../statistics/statistics.module";
import { AccountsModule } from "../accounts/accounts.module";

@Module({
  imports: [StatisticsModule, AccountsModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
