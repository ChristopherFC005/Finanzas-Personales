import { IsDateString, IsIn, IsOptional } from "class-validator";

export type StatisticsPeriod =
  | "this_month"
  | "three_months"
  | "six_months"
  | "year"
  | "custom";

export class QueryStatisticsDto {
  @IsOptional()
  @IsIn(["this_month", "three_months", "six_months", "year", "custom"])
  period?: StatisticsPeriod = "this_month";

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
