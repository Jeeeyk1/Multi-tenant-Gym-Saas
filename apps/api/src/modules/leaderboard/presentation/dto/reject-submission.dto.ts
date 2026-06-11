import { IsString, MaxLength } from 'class-validator';

export class RejectSubmissionDto {
  @IsString()
  @MaxLength(500)
  reason!: string;
}
