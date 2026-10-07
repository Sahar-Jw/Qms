import { Body, Controller, Delete, Get, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MinRole } from '../common/decorators/min-role.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RoleCode } from '../common/enums';
import { ResetTranslationDto, SaveTranslationDto } from './dto/translation.dto';
import { TranslationsService } from './translations.service';

/** Edited UI texts. Reading is public (the sign-in page needs them); editing is managers and above only. */
@ApiTags('translations')
@Controller('translations')
export class TranslationsController {
  constructor(private readonly translations: TranslationsService) {}

  @Public()
  @Get()
  map() {
    return this.translations.map();
  }

  @Put()
  @MinRole(RoleCode.MANAGER)
  save(@Body() dto: SaveTranslationDto, @CurrentUser() me: AuthUser) {
    return this.translations.save(dto, me.id);
  }

  @Delete()
  @MinRole(RoleCode.MANAGER)
  reset(@Query() q: ResetTranslationDto) {
    return this.translations.reset(q.key);
  }
}
