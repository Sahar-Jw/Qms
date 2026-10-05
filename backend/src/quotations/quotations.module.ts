import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalcModule } from '../calc/calc.module';
import { PdfModule } from '../pdf/pdf.module';
import { QuotationItemAmount } from './quotation-item-amount.entity';
import { QuotationItem } from './quotation-item.entity';
import { Quotation } from './quotation.entity';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';
import { Sequence } from './sequence.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Quotation, QuotationItem, QuotationItemAmount, Sequence]), CalcModule, PdfModule],
  controllers: [QuotationsController],
  providers: [QuotationsService],
  exports: [QuotationsService],
})
export class QuotationsModule {}
