import { IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class AnalyseMealDto {
  @IsOptional()
  @IsString()
  @Length(1, 500)
  description?: string;

  @IsOptional()
  @IsUrl()
  photoUrl?: string;
}
