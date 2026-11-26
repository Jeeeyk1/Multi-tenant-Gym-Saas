import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { StaffRole } from '../../../../common/enums';

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

  /** The role to give right away. Optional, so older clients that assign it afterwards keep working. */
  @IsOptional()
  @IsEnum(StaffRole)
  role?: StaffRole;
}
