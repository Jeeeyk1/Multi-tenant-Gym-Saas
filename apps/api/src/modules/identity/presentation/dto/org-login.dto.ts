import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';

export class OrgLoginDto {
  @IsString()
  @IsNotEmpty()
  orgSlug!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
