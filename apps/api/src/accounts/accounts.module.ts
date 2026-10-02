import { Module } from "@nestjs/common";
import { AccountsController } from "./accounts.controller";
import { AccountsService } from "./accounts.service";
import { CardRemindersService } from "./card-reminders.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [AccountsController],
  providers: [AccountsService, CardRemindersService],
  exports: [AccountsService],
})
export class AccountsModule {}
