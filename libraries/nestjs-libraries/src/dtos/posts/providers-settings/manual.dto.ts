import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const httpsUrlRegex = /^https:\/\/[^\s/]+\.[^\s/]+(\/\S*)?$/;

export class ManualDto {
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.liveUrl)
  @Matches(httpsUrlRegex, {
    message: 'Live URL must be an https URL',
  })
  liveUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  postedNote?: string;
}
