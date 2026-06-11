import { IsIn, IsString, Length } from 'class-validator';

export class RegisterDeviceTokenDto {
  @IsString()
  @Length(1, 512)
  token!: string;

  @IsIn(['ios', 'android'])
  platform!: 'ios' | 'android';
}
