import { IsEnum, IsString, MaxLength } from 'class-validator';
import { ExerciseCategory } from '../../../../common/enums';

export class AddGymExerciseDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsEnum(ExerciseCategory)
  category!: ExerciseCategory;
}
