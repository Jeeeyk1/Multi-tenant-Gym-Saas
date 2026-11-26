import { IsInt, Min } from 'class-validator';

export class AcceptCommunityRulesDto {
  /** The version the person read; must be the current one. */
  @IsInt()
  @Min(1)
  version!: number;
}
