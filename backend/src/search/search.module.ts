import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { MaterialsModule } from '../materials/materials.module';
import { QuotationsModule } from '../quotations/quotations.module';
import { SearchController } from './search.controller';

@Module({ imports: [QuotationsModule, CustomersModule, MaterialsModule], controllers: [SearchController] })
export class SearchModule {}
