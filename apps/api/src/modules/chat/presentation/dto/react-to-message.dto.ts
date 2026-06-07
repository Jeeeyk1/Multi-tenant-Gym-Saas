import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ReactToMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  emoji!: string;
}
