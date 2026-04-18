import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class InviteStaffDto {
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
