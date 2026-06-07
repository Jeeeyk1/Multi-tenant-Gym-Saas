import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

const VALID_METHODS = ['MANUAL_STAFF', 'QR_STAFF_SCAN', 'QR_SELF_SCAN', 'APP_SELF_CHECKIN'] as const;

export class CheckInDto {
  @IsIn(VALID_METHODS)
  method!: string;

  @IsOptional()
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @IsString()
  qrCodeToken?: string;
}
