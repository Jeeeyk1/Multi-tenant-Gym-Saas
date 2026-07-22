import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsString, ValidateNested } from 'class-validator';

// Deliberately lenient — the use case re-validates each row and skips bad ones
// instead of failing the whole batch, so we don't enforce email/date format here.
class BulkInviteMemberDto {
  @IsString() declare email: string;
  @IsString() declare fullName: string;
  @IsString() declare expiryDate: string;
}

export class BulkInviteDto {
  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => BulkInviteMemberDto)
  declare members: BulkInviteMemberDto[];
}
