import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';

export class GymLoginDto {
  @IsString()
  @IsNotEmpty()
  gymCode!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
