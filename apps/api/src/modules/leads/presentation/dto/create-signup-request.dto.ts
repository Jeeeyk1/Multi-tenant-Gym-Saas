import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSignupRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare gymName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare ownerName: string;

  @IsEmail()
  declare email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  planInterest?: string;
}
