import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/auth.types";
import { AdminService } from "./admin.service";
import { QueryAdminUsersDto } from "./dto/query-admin-users.dto";
import { PaginationQueryDto } from "../common/pagination/pagination.dto";

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles("ADMIN", "SUPER_ADMIN")
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("dashboard")
  dashboard() {
    return this.adminService.dashboard();
  }

  @Get("users")
  findUsers(@Query() query: QueryAdminUsersDto) {
    return this.adminService.findUsers(query);
  }

  @Get("users/:id")
  findUserDetail(@Param("id", ParseUUIDPipe) id: string) {
    return this.adminService.findUserDetail(id);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Patch("users/:id/suspend")
  suspendUser(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.adminService.suspendUser(actor, id, req.ip);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Patch("users/:id/reactivate")
  reactivateUser(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.adminService.reactivateUser(actor, id, req.ip);
  }

  @Get("audit-logs")
  findAuditLogs(@Query() query: PaginationQueryDto) {
    return this.adminService.findAuditLogs(query);
  }
}
