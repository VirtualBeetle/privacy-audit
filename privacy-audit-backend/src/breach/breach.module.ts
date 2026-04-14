import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BreachReport } from './breach-report.entity';
import { BreachService } from './breach.service';
import { BreachController } from './breach.controller';
import { DashboardGuard, DashboardAnyGuard } from '../common/guards/dashboard.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([BreachReport]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({ secret: cs.get<string>('JWT_SECRET') }),
    }),
  ],
  controllers: [BreachController],
  providers: [BreachService, DashboardGuard, DashboardAnyGuard],
  exports: [BreachService],
})
export class BreachModule {}
