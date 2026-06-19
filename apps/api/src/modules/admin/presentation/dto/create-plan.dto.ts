import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  declare name: string;

  @IsString()
  @IsOptional()
  declare description?: string;

  @IsNumber()
  @Min(0)
  declare priceMonthly: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  declare priceYearly?: number;

  @IsArray()
  @IsString({ each: true })
  declare features: string[];

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
