import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class SaveLadderDto {
  /** False switches the ladder off; members keep rungs they already earned. */
  @IsBoolean()
  declare enabled: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(1000)
  bronzeKg?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(1000)
  silverKg?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(1000)
  goldKg?: number;
}
