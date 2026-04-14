import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Webhook } from './webhook.entity';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { DashboardGuard, DashboardAnyGuard } from '../common/guards/dashboard.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Webhook]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({ secret: cs.get<string>('JWT_SECRET') }),
    }),
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService, DashboardGuard, DashboardAnyGuard],
  exports: [WebhooksService],
})
export class WebhooksModule {}
