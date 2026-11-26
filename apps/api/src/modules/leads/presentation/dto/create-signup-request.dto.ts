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
  @MaxLength(200)
  declare email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  declare phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  planInterest?: string;

  // Honeypot: only bots fill it.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
