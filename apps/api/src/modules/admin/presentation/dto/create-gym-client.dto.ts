import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import { BillingCycle } from '../../../../common/enums';

export class CreateGymClientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare gymName: string;

  @IsString()
  @Matches(/^[A-Z0-9]{3,12}$/, { message: 'Gym code must be 3-12 uppercase alphanumeric characters' })
  declare gymCode: string;

  @IsEmail()
  declare ownerEmail: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  declare ownerFullName: string;

  @IsUUID()
  declare planId: string;

  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;
}
