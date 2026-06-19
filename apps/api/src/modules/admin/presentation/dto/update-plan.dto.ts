import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePlanDto {
  @IsString()
  @IsOptional()
  declare name?: string;

  @IsString()
  @IsOptional()
  declare description?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  declare priceMonthly?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  declare priceYearly?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  declare features?: string[];

  @IsBoolean()
  @IsOptional()
  declare isPopular?: boolean;

  @IsBoolean()
  @IsOptional()
  declare isActive?: boolean;

  @IsNumber()
  @IsOptional()
  declare sortOrder?: number;
}
