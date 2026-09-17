import { PaymentMethod, TransactionType } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from "class-validator";

// Amounts travel as decimal strings end-to-end (never JS floats) so
// PostgreSQL NUMERIC / Prisma Decimal keep full precision.
const DECIMAL_MONEY = /^\d{1,12}(\.\d{1,2})?$/;

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  type!: TransactionType;

  @Matches(DECIMAL_MONEY, {
    message: "El monto debe ser un número positivo con hasta 2 decimales.",
  })
  amount!: string;

  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsDateString()
  transactionDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
