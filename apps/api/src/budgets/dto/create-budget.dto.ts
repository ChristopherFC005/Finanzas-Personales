import {
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
} from "class-validator";

const DECIMAL_MONEY = /^\d{1,12}(\.\d{1,2})?$/;

export class CreateBudgetDto {
  @IsUUID()
  categoryId!: string;

  @Matches(DECIMAL_MONEY, {
    message: "El monto debe ser un número positivo con hasta 2 decimales.",
  })
  amount!: string;

  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  alertPercentage?: number;
}
