import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { NestFactory } from '@nestjs/core';
import { ApiExceptionFilter } from './shared/presentation/filters/api-exception.filter.js';
import { ApiResponseInterceptor } from './shared/presentation/interceptors/api-response.interceptor.js';

async function bootstrap() {
  if (existsSync('.env')) {
    loadEnvFile();
  }

  const { AppModule } = await import('./app.module.js');
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
