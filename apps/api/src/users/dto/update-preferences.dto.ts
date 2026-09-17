import { ThemeMode } from "@prisma/client";
import {
  IsBoolean,
  IsEnum,
  IsHexColor,
  IsOptional,
  IsString,
  Length,
} from "class-validator";

export class UpdatePreferencesDto {
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsEnum(ThemeMode)
  themeMode?: ThemeMode;

  @IsOptional()
  @IsHexColor({ message: "primaryColor debe ser un color hexadecimal." })
  primaryColor?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;
}
