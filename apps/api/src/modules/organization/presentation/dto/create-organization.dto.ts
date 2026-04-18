import { IsEmail, IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  /**
   * URL-safe slug for org login entry. Lowercase letters, digits, and hyphens only.
   * e.g. "fitlife-ph", "irongyms"
   */
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug may only contain lowercase letters, digits, and hyphens',
  })
  @MinLength(3)
  slug!: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  @IsNotEmpty()
  ownerFullName!: string;
}
