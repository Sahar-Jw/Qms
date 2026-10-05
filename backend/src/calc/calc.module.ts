import { Module } from '@nestjs/common';
import { CalcService } from './calc.service';

@Module({ providers: [CalcService], exports: [CalcService] })
export class CalcModule {}
