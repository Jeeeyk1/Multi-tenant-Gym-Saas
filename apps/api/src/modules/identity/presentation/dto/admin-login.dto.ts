import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class AdminLoginDto {
  @IsEmail()
  declare email: string;

  @IsString()
  @IsNotEmpty()
  declare password: string;
}
