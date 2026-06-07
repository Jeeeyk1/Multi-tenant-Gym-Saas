import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsDateString()
  @Type(() => String)
  publishAt?: string | null;

  @IsOptional()
  @IsDateString()
  @Type(() => String)
  expiresAt?: string | null;
}
