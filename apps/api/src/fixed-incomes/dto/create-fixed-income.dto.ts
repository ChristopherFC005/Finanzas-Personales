import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";

const DECIMAL_MONEY = /^\d{1,12}(\.\d{1,2})?$/;

export class CreateFixedIncomeDto {
  // Ej. "Sueldo quincenal", "Ventas del negocio" — lo específico que
  // distingue este ingreso, además de su categoría (Salario/Negocio/otra).
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsUUID()
  categoryId!: string;

  // A qué cuenta/tarjeta entra el dinero cada mes.
  @IsUUID()
  accountId!: string;

  @Matches(DECIMAL_MONEY, {
    message: "El monto debe ser un número positivo con hasta 2 decimales.",
  })
  amount!: string;

  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
