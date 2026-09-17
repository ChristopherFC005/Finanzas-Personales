import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s-]{6,20}$/, {
    message: "El número de celular no es válido.",
  })
  phone?: string;
}
