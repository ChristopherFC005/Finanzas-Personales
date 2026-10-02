import { PartialType } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";
import { CreateFixedIncomeDto } from "./create-fixed-income.dto";

export class UpdateFixedIncomeDto extends PartialType(CreateFixedIncomeDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
