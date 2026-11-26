import { IsNumber, Max, Min } from 'class-validator';

/** US dollars per gym per month. */
export class UpdateBillingPlanAiCapsDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000)
  declare assistantAiCapUsd: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000)
  declare memberAiCapUsd: number;
}
