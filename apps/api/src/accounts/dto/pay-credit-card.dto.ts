import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsUUID, Matches } from "class-validator";

const DECIMAL_MONEY = /^\d{1,12}(\.\d{1,2})?$/;

export class PayCreditCardDto {
  @Matches(DECIMAL_MONEY, {
    message: "El monto debe ser un número positivo con hasta 2 decimales.",
  })
  amount!: string;

  // De qué cuenta/tarjeta sale el dinero para este pago — se descuenta de
  // su saldo, igual que con los préstamos.
  @IsUUID()
  sourceAccountId!: string;

  @IsOptional()
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsBoolean()
  isInstallment?: boolean;
}
