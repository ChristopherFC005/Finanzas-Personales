import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, Matches } from "class-validator";

const DECIMAL_MONEY = /^\d{1,12}(\.\d{1,2})?$/;

export class PayCreditCardDto {
  @Matches(DECIMAL_MONEY, {
    message: "El monto debe ser un número positivo con hasta 2 decimales.",
  })
  amount!: string;

  @IsOptional()
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsBoolean()
  isInstallment?: boolean;
}
