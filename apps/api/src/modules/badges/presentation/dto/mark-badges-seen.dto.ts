import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class MarkBadgesSeenDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  declare badgeIds: string[];
}
