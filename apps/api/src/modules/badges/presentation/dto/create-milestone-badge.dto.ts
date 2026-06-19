import { IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';

export class CreateMilestoneBadgeDto {
  @IsUUID()
  declare exerciseId: string;

  @IsString()
  @MaxLength(100)
  declare badgeName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(1)
  @Max(9999.99)
  declare weightKg: number;

  @IsString()
  @MaxLength(50)
  declare icon: string;

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a valid hex color (#RRGGBB)' })
  declare color: string;
}
