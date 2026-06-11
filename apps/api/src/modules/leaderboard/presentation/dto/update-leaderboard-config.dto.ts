import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';

export class LeaderboardConfigItemDto {
  @IsUUID()
  exerciseId!: string;

  @IsBoolean()
  isActive!: boolean;

  @IsInt()
  @Min(0)
  displayOrder!: number;
}

export class UpdateLeaderboardConfigDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LeaderboardConfigItemDto)
  exercises!: LeaderboardConfigItemDto[];
}
