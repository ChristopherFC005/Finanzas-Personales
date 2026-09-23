import { PartialType } from "@nestjs/swagger";
import { LoanStatus } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";
import { CreateLoanDto } from "./create-loan.dto";

export class UpdateLoanDto extends PartialType(CreateLoanDto) {
  @IsOptional()
  @IsEnum(LoanStatus)
  status?: LoanStatus;
}
