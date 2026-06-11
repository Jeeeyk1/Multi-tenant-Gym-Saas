import { IsString, Length } from 'class-validator';

export class AnalyseMealDto {
  @IsString()
  @Length(1, 500)
  description!: string;
}
