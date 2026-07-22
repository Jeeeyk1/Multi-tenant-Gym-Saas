import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { BillingCycle } from '../../../../common/enums';
import { MAX_TRIAL_DAYS, MIN_TRIAL_DAYS } from '../../../billing/domain/billing.constants';

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

  /**
   * When set, the gym is provisioned as a free trial for this many days (usable
   * immediately, no invoice) instead of the pay-first flow. It converts to a
   * payable subscription when the trial lapses.
   */
  @IsOptional()
  @IsInt()
  @Min(MIN_TRIAL_DAYS)
  @Max(MAX_TRIAL_DAYS)
  trialDays?: number;
}
