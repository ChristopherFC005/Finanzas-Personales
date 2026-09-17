import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { StatisticsModule } from "../statistics/statistics.module";

@Module({
  imports: [StatisticsModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
