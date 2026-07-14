import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitPaymentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare reference: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  method?: string;
}
