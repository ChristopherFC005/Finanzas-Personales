import { TransactionType } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateCategoryDto {
  @IsString()
  @MaxLength(60)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  icon?: string;

  @IsEnum(TransactionType)
  type!: TransactionType;
}
