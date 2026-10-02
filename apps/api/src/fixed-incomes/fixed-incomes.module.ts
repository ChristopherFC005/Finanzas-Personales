import { Module } from "@nestjs/common";
import { FixedIncomesController } from "./fixed-incomes.controller";
import { FixedIncomesService } from "./fixed-incomes.service";
import { FixedIncomesAutomationService } from "./fixed-incomes-automation.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [FixedIncomesController],
  providers: [FixedIncomesService, FixedIncomesAutomationService],
})
export class FixedIncomesModule {}
