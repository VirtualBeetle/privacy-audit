import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  app.enableCors();

  // ── Swagger / OpenAPI ────────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Privacy Audit Service')
    .setDescription(
      'Multi-tenant privacy audit and GDPR compliance platform. ' +
      'Tracks data access events, runs AI risk analysis (Claude/Gemini/OpenAI), ' +
      'manages consent, and supports GDPR rights (Art.17 erasure, Art.20 portability).',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Dashboard session JWT' }, 'dashboard_session')
    .addApiKey({ type: 'apiKey', in: 'header', name: 'x-api-key', description: 'Tenant API key for event ingestion' }, 'api_key')
    .addTag('tenants', 'Tenant registration and onboarding')
    .addTag('auth', 'Authentication (email/password + Google OAuth)')
    .addTag('events', 'Audit event ingestion (API key protected)')
    .addTag('dashboard', 'Dashboard data: events, exports, deletions, AI chat')
    .addTag('consents', 'GDPR Art.7 consent management')
    .addTag('webhooks', 'HMAC-signed webhook delivery on risk alerts')
    .addTag('breach', 'GDPR Art.33 breach notification simulation')
    .addTag('dev', 'Developer tools — manual triggers (DEV_TOKEN protected)')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Privacy Audit API',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Privacy Audit Service running on port ${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
