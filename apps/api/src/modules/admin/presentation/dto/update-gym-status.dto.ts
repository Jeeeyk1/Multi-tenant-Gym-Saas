import { IsEnum } from 'class-validator';

export class UpdateGymStatusDto {
  @IsEnum(['ACTIVE', 'SUSPENDED'])
  declare status: 'ACTIVE' | 'SUSPENDED';
}
