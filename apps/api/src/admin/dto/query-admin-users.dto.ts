import { UserStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../../common/pagination/pagination.dto";

export class QueryAdminUsersDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
