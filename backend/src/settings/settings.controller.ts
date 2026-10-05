import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SettingsService } from './settings.service';

class UpdateSettingsDto {
  @IsInt()
  issuingCompanyId: number;
}

/** Per-user settings. Today: which company the user's quotations are issued from. */
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
}
