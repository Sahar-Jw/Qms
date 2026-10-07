import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TranslationOverride } from './translation-override.entity';
import { TranslationsController } from './translations.controller';
import { TranslationsService } from './translations.service';

@Module({
  imports: [TypeOrmModule.forFeature([TranslationOverride])],
  controllers: [TranslationsController],
  providers: [TranslationsService],
})
export class TranslationsModule {}
