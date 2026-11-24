import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { BadgeCategory } from '../../../../common/enums';

export class CreateCustomBadgeDto {
  @IsString()
  @MaxLength(100)
  declare name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @MaxLength(50)
  declare icon: string;

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a valid hex color (#RRGGBB)' })
  declare color: string;

  /** Which equip slot the badge uses. Defaults to Loyalty. */
  @IsOptional()
  @IsEnum(BadgeCategory)
  category?: BadgeCategory;
}
