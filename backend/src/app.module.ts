import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditInterceptor } from './audit/audit.interceptor';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CalcModule } from './calc/calc.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { CompaniesModule } from './companies/companies.module';
import { validateEnv } from './config/env';
import { CustomersModule } from './customers/customers.module';
import { buildDataSourceOptions } from './database/data-source-options';
import { MaterialsModule } from './materials/materials.module';
import { PdfModule } from './pdf/pdf.module';
import { QuotationsModule } from './quotations/quotations.module';
import { RolesModule } from './roles/roles.module';
import { SearchModule } from './search/search.module';
import { SettingsModule } from './settings/settings.module';
import { TranslationsModule } from './translations/translations.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    TypeOrmModule.forRootAsync({ useFactory: () => buildDataSourceOptions() }),
    AuditModule,
    AuthModule,
    UsersModule,
    RolesModule,
    CompaniesModule,
    CustomersModule,
    MaterialsModule,
    CalcModule,
    PdfModule,
    QuotationsModule,
    SearchModule,
    SettingsModule,
    TranslationsModule,
  ],
  providers: [
    // Order matters: throttle -> authenticate -> authorize
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
