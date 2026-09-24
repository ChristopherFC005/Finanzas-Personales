import { LoanPaymentType } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsDateString,
  IsEnum,
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

// `@IsOptional()` only skips validation for null/undefined — an empty
// string still runs through IsDateString/IsInt and fails. Clients that
// clear a field (or, like our own form, leave a since-hidden field's
// stale "" in place) send "" rather than omitting the key, so normalize
// that to undefined before validation runs.
const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === "" ? undefined : value;

export class CreateLoanDto {
  @IsString()
  @MaxLength(120)
  borrowerName!: string;

  @Matches(DECIMAL_MONEY, {
    message: "El monto debe ser un número positivo con hasta 2 decimales.",
  })
  totalAmount!: string;

  @IsEnum(LoanPaymentType)
  paymentType!: LoanPaymentType;

  // De qué cuenta/tarjeta sale el dinero prestado — se descuenta de su saldo.
  @IsUUID()
  accountId!: string;

  // Requerido solo cuando paymentType = SINGLE (validado en el service,
  // porque depende del valor de otro campo).
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  dueDate?: string;

  // Requeridos solo cuando paymentType = INSTALLMENTS.
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsInt()
  @Min(1)
  @Max(120)
  installmentsCount?: number;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  firstDueDate?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(500)
  notes?: string;
}
