import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  if (existsSync(".env")) {
    loadEnvFile()
  }

  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
