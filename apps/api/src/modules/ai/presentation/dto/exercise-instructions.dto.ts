import { IsString, MinLength, MaxLength } from 'class-validator';

export class ExerciseInstructionsDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  exerciseName!: string;
}
