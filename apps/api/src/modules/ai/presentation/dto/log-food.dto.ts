import { IsInt, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class LogFoodDto {
  @IsString()
  @Length(1, 500)
  description!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  calories?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  proteinG?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  carbsG?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  fatG?: number;
}
