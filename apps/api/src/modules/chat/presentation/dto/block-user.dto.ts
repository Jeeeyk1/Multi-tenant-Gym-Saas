import { IsUUID } from 'class-validator';

export class BlockUserDto {
  @IsUUID('loose')
  userId!: string;
}
