import { IsIn, IsOptional } from 'class-validator';

const VALID_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'EXPIRED', 'ARCHIVED'] as const;

export class ListAnnouncementsQueryDto {
  @IsOptional()
  @IsIn(VALID_STATUSES)
  status?: string;
}
