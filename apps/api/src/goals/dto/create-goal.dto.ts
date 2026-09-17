import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";

const DECIMAL_MONEY = /^\d{1,12}(\.\d{1,2})?$/;

export class CreateGoalDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @Matches(DECIMAL_MONEY, {
    message: "El monto objetivo debe ser un número positivo con hasta 2 decimales.",
  })
  targetAmount!: string;

  @IsOptional()
  @IsDateString()
  targetDate?: string;
}
