import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { SignupRequestStatus } from '../../../../common/enums';

export class UpdateSignupRequestStatusDto {
  @IsIn([SignupRequestStatus.CONTACTED, SignupRequestStatus.REJECTED])
  declare status: SignupRequestStatus.CONTACTED | SignupRequestStatus.REJECTED;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
