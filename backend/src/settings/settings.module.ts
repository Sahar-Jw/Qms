import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Company])],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
