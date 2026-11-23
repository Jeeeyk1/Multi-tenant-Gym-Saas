import { Type } from 'class-transformer';
import { IsISO8601, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { ISO_DATE_PATTERN } from '../../../../common/time/local-date';

export class ListFoodLogsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  /** YYYY-MM-DD in the gym's timezone. Omit for the most recent entries on any day. */
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: 'date must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  date?: string;
}
