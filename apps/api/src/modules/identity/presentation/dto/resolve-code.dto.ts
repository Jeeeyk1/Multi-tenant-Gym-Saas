import { IsString, IsNotEmpty } from 'class-validator';

export class ResolveCodeDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
}
