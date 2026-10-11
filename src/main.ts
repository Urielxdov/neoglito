import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { assertDockerIsRunning } from './container/infrastructure/docker/assert-docker-is-running.js';
import { ApiExceptionFilter } from './shared/presentation/filters/api-exception.filter.js';
import { ApiResponseInterceptor } from './shared/presentation/interceptors/api-response.interceptor.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { startTelemetrySdk } from './telemetry/infrastructure/sdk/start-telemetry-sdk.js';
import { TelemetryLogger } from './telemetry/infrastructure/sdk/telemetry-logger.js';

async function bootstrap() {
  if (existsSync('.env')) {
    loadEnvFile();
  }

  assertDockerIsRunning();
  // Antes de importar AppModule: las instrumentaciones parchean las librerías al cargarlas.
  startTelemetrySdk();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Neoglito API')
    .setDescription('Documentacion del backend de neoglito')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const { AppModule } = await import('./app.module.js');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(new TelemetryLogger());
  // Los lotes OTLP que reenvía el collector superan el límite por defecto (100 kb).
  app.useBodyParser('json', { limit: '10mb' });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5174',
    credentials: true,
  });

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('docs', app, swaggerDocument)

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
