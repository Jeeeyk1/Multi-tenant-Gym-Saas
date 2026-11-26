import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DeleteMyAccountDto {
  /** The current password, so a borrowed phone can't delete the account. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  password!: string;
}
