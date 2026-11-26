import { IsBoolean } from 'class-validator';

export class UpdateRoleSettingDto {
  @IsBoolean()
  declare enabled: boolean;
}
