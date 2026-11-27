import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { GymStatus } from '../../../../common/enums';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || undefined : value);

/** Shared paging for admin lists. */
export class AdminPageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  /** Case-insensitive text match. Empty or whitespace-only means no filter. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;
}

/** GET /admin/gyms — search matches name, code or city. */
export class ListGymsQueryDto extends AdminPageQueryDto {
  @IsOptional()
  @IsEnum(GymStatus)
  status?: GymStatus;
}

/** GET /admin/users — search matches name or email. */
export class ListUsersQueryDto extends AdminPageQueryDto {
  @IsOptional()
  @IsUUID()
  gymId?: string;
}
