import { IsInt, Max, Min } from 'class-validator';
import { MAX_TRIAL_DAYS, MIN_TRIAL_DAYS } from '../../../billing/domain/billing.constants';

export class ExtendTrialDto {
  /** Number of additional trial days to grant. */
  @IsInt()
  @Min(MIN_TRIAL_DAYS)
  @Max(MAX_TRIAL_DAYS)
  declare days: number;
}
