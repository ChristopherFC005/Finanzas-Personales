import { PartialType, OmitType } from "@nestjs/swagger";
import { CreateBudgetDto } from "./create-budget.dto";

// The category/month/year triplet defines which budget this is — changing
// any of them is "create a different budget", not an edit of this one.
export class UpdateBudgetDto extends PartialType(
  OmitType(CreateBudgetDto, ["categoryId", "month", "year"] as const),
) {}
