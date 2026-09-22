import { AccountType } from "@prisma/client";
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";

// Balances travel as decimal strings end-to-end (never JS floats) so
// PostgreSQL NUMERIC / Prisma Decimal keep full precision.
const DECIMAL_MONEY = /^-?\d{1,12}(\.\d{1,2})?$/;

export class CreateAccountDto {
  @IsString()
  @MaxLength(60)
  name!: string;

  @IsEnum(AccountType)
  type!: AccountType;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  bank?: string;

  @IsOptional()
  @Matches(DECIMAL_MONEY, {
    message: "El saldo inicial debe ser un número con hasta 2 decimales.",
  })
  initialBalance?: string;

  @IsOptional()
  @Matches(/^\d{1,12}(\.\d{1,2})?$/, {
    message: "La línea de crédito debe ser un número positivo con hasta 2 decimales.",
  })
  creditLimit?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: "color debe ser un hexadecimal." })
  color?: string;
}
