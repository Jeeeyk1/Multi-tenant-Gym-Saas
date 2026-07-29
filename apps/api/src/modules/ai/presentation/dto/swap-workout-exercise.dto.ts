import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** Identifies the single exercise (within a saved plan) the member wants replaced. */
export class SwapWorkoutExerciseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  day!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  sectionTitle!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  exerciseName!: string;

  /** Optional free-text reason (e.g. "no cable machine") so the swap avoids the whole category. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
