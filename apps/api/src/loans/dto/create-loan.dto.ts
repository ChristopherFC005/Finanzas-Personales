import { LoanPaymentType } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsBoolean,
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

  // De qué cuenta/tarjeta sale el dinero prestado — se descuenta de su saldo,
  // salvo que isExternal sea true (ver abajo), en cuyo caso solo es la cuenta
  // que recibirá los cobros.
  @IsUUID()
  accountId!: string;

  // true = el dinero ya se prestó fuera de la app (efectivo, ya entregado
  // antes de registrar esto): no se descuenta de accountId, solo se anota
  // para poder cobrarlo. false/omitido = comportamiento normal.
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsBoolean()
  isExternal?: boolean;

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
