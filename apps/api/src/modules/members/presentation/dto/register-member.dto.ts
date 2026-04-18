import { IsDateString, IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class RegisterMemberDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUUID()
  planId?: string;

  /**
   * Required when planId is not provided.
   * Format: YYYY-MM-DD
   */
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}
