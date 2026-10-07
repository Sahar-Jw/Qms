import { Body, Controller, Delete, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDefined, IsInt, IsObject, Matches, ValidateNested } from 'class-validator';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MinRole } from '../common/decorators/min-role.decorator';
import { RoleCode } from '../common/enums';
import { SettingsService } from './settings.service';
import { HEX_COLOR } from './theme';

class UpdateSettingsDto {
  @IsInt()
  issuingCompanyId: number;
}

const HEX_MESSAGE = 'must be a colour like #A1B2C3';

class ThemeColorsDto {
  @Matches(HEX_COLOR, { message: `ink ${HEX_MESSAGE}` }) ink: string;
  @Matches(HEX_COLOR, { message: `cocoa ${HEX_MESSAGE}` }) cocoa: string;
  @Matches(HEX_COLOR, { message: `clay ${HEX_MESSAGE}` }) clay: string;
  @Matches(HEX_COLOR, { message: `stone ${HEX_MESSAGE}` }) stone: string;
  @Matches(HEX_COLOR, { message: `sand ${HEX_MESSAGE}` }) sand: string;
}

class UpdateThemeDto {
  @IsDefined() @IsObject() @ValidateNested() @Type(() => ThemeColorsDto)
  colors: ThemeColorsDto;
}

/** Per-user settings (the issuing company) and the site-wide colour theme. */
@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  /** Any user: the companies available in the settings picker. */
  @Get('companies')
  companies() {
    return this.settings.pickList();
  }

  @Get()
  get(@CurrentUser() me: AuthUser) {
    return this.settings.get(me.id);
  }

  @Patch()
  update(@Body() dto: UpdateSettingsDto, @CurrentUser() me: AuthUser) {
    return this.settings.setIssuingCompany(me.id, dto.issuingCompanyId);
  }

  /** Any signed-in user: everyone sees the site in the saved colours. */
  @Get('theme')
  theme() {
    return this.settings.getTheme();
  }

  /** Manager and above. */
  @Patch('theme')
  @MinRole(RoleCode.MANAGER)
  updateTheme(@Body() dto: UpdateThemeDto, @CurrentUser() me: AuthUser) {
    return this.settings.setTheme(dto.colors, me.id);
  }

  /** Manager and above: back to the default colours. */
  @Delete('theme')
  @MinRole(RoleCode.MANAGER)
  resetTheme() {
    return this.settings.resetTheme();
  }
}
