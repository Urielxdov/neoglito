import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { RepositoryModule } from './repository/repository.module.js';

@Module({
  imports: [RepositoryModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
