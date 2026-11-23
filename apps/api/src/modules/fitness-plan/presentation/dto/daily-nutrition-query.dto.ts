import { IsISO8601, IsOptional, Matches } from 'class-validator';
import { ISO_DATE_PATTERN } from '../../../../common/time/local-date';

export class DailyNutritionQueryDto {
  /** YYYY-MM-DD in the gym's timezone. Defaults to today there. */
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: 'date must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  date?: string;
}
