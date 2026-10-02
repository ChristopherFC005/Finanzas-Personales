import { Module } from "@nestjs/common";
import { GoalsController } from "./goals.controller";
import { GoalInvitesController } from "./goal-invites.controller";
import { GoalsService } from "./goals.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [GoalsController, GoalInvitesController],
  providers: [GoalsService],
})
export class GoalsModule {}
