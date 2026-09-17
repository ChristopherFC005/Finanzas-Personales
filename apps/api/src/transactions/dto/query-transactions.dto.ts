import { PaymentMethod, TransactionType } from "@prisma/client";
import { IsDateString, IsEnum, IsIn, IsOptional, IsString, IsUUID } from "class-validator";
import { PaginationQueryDto } from "../../common/pagination/pagination.dto";

export class QueryTransactionsDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(["transactionDate", "amount", "createdAt"])
  sortBy?: "transactionDate" | "amount" | "createdAt" = "transactionDate";

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder?: "asc" | "desc" = "desc";
}
