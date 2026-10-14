import { IsDefined, IsOptional, IsString, MaxLength } from 'class-validator';

// Field rules live in parseManualFields (manual.provider.ts); this only guards the shape.
export class ManualCardDto {
  // Only sent when the display name was edited; '' resets it.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsString()
  @IsDefined()
  platform: string;

  @IsString()
  @IsDefined()
  handle: string;

  @IsString()
  @IsDefined()
  profile_url: string;

  @IsOptional()
  @IsString()
  login_email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}
