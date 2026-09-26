import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { NestFactory } from '@nestjs/core';
import { assertDockerIsRunning } from './shared/infrastructure/docker/assert-docker-is-running.js';
import { ApiExceptionFilter } from './shared/presentation/filters/api-exception.filter.js';
import { ApiResponseInterceptor } from './shared/presentation/interceptors/api-response.interceptor.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  if (existsSync('.env')) {
    loadEnvFile();
  }

  assertDockerIsRunning();

  const swaggerConfig = new DocumentBuilder()
        .setTitle('Neoglito API')
        .setDescription('Documentacion del backend de neoglito')
        .setVersion('1.0')
        .addBearerAuth()
        .build()

  const { AppModule } = await import('./app.module.js');
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('docs', app, swaggerDocument)
}
await bootstrap();
