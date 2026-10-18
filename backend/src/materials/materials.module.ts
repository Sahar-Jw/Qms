import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsModule } from '../settings/settings.module';
import { CatalogUploadInterceptor } from './catalog-upload.interceptor';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
import { Material } from './material.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Material]), SettingsModule],
  controllers: [MaterialsController],
  providers: [MaterialsService, CatalogUploadInterceptor],
  exports: [MaterialsService],
})
export class MaterialsModule {}
