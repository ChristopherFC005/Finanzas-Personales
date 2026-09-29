import { IsOptional, IsString, MaxLength } from "class-validator";
import { QueryTransactionsDto } from "./query-transactions.dto";

export class ExportTransactionsDto extends QueryTransactionsDto {
  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;
}
