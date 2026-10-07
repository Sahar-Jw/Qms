import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { TrimOptional } from '../../common/decorators/validators';

export const I18N_KEY = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/;

export class SaveTranslationDto {
  @IsString() @MaxLength(190) @Matches(I18N_KEY, { message: 'key must look like section.name' })
  key: string;

  /** Empty / missing = use the built-in Arabic text. */
  @IsOptional() @TrimOptional() @IsString() @MaxLength(2000)
  ar?: string;

  /** Empty / missing = use the built-in English text. */
  @IsOptional() @TrimOptional() @IsString() @MaxLength(2000)
  en?: string;
}

export class ResetTranslationDto {
  @IsString() @MaxLength(190) @Matches(I18N_KEY, { message: 'key must look like section.name' })
  key: string;
}

export type TranslationMap = Record<string, { ar?: string; en?: string }>;
