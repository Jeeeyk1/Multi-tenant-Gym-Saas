import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class LogWorkoutSessionDto {
  @IsString()
  declare workoutType: string;

  @IsDateString()
  declare startedAt: string;

  @IsDateString()
  declare endedAt: string;

  @IsInt()
  @Min(1)
  @Max(480)
  declare durationMinutes: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  caloriesBurned?: number;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(250)
  avgHeartRate?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
