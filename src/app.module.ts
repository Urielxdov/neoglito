import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { RepositoryModule } from './repository/repository.module.js';
import { AuthModule } from './auth/auth.module.js';
import { RestoreDeploymentPortReservationsService } from './startup/restore-deployment-port-reservations.service.js';

@Module({
  imports: [RepositoryModule, AuthModule],
  controllers: [AppController],
  providers: [AppService, RestoreDeploymentPortReservationsService],
})
export class AppModule {}
