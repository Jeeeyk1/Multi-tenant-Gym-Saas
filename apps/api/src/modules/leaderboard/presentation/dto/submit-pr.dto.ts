import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class SubmitPrDto {
  @IsUUID()
  exerciseId!: string;

  @IsNumber()
  @Min(1)
  @Max(999)
  weightKg!: number;

  @IsInt()
  @Min(1)
  @Max(60)
  reps!: number;

  @IsString()
  photoUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsUUID()
  memberId?: string;
}
