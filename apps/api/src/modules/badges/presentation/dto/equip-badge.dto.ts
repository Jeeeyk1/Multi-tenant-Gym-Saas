import { IsBoolean } from 'class-validator';

export class EquipBadgeDto {
  @IsBoolean()
  equipped!: boolean;
}
