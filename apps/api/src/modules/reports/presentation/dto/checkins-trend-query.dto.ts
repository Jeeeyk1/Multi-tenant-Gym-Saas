import { IsIn, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CheckinsTrendQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsIn([7, 30])
  days?: number;
}
