import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateMyPrivacyDto {
  @IsOptional()
  @IsBoolean()
  hideCheckinVisibility?: boolean;

  @IsOptional()
  @IsBoolean()
  hideFromMemberList?: boolean;
}
