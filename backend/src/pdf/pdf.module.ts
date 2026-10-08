import { Module } from '@nestjs/common';
import { TranslationsModule } from '../translations/translations.module';
import { PdfService } from './pdf.service';

@Module({ imports: [TranslationsModule], providers: [PdfService], exports: [PdfService] })
export class PdfModule {}
