import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Consent } from './consent.entity';
import { ConsentsService } from './consents.service';
import { ConsentsController } from './consents.controller';
import { DashboardGuard, DashboardAnyGuard } from '../common/guards/dashboard.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Consent]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({ secret: cs.get<string>('JWT_SECRET') }),
    }),
  ],
  controllers: [ConsentsController],
  providers: [ConsentsService, DashboardGuard, DashboardAnyGuard],
  exports: [ConsentsService],
})
export class ConsentsModule {}
