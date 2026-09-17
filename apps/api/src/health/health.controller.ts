import { Controller, Get, VERSION_NEUTRAL, Version } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Version(VERSION_NEUTRAL)
  @Get()
  check(): { status: string } {
    return { status: "ok" };
  }
}
