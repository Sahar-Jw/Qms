import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';
import { AppSetting } from './app-setting.entity';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Company, AppSetting])],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService], // the materials upload reads the catalog size limit
})
export class SettingsModule {}
