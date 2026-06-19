import { IsOptional, IsString, IsUUID } from 'class-validator';

export class AwardCustomBadgeDto {
  @IsUUID()
  declare memberId: string;

  @IsUUID()
  declare customBadgeId: string;

  @IsString()
  @IsOptional()
  proofUrl?: string;

  @IsString()
  @IsOptional()
  proofNotes?: string;
}
