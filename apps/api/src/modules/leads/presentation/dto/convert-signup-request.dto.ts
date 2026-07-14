import { IsUUID } from 'class-validator';

export class ConvertSignupRequestDto {
  @IsUUID()
  declare gymId: string;
}
