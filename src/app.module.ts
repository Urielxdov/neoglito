import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { RestoreDeploymentPortReservationsService } from './startup/restore-deployment-port-reservations.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProjectModule } from './project/project.module.js';
import { RepositoryModule } from './repository/repository.module.js';
import { DeploymentModule } from './deployment/deployment.module.js';
import { ContainerModule } from './container/container.module.js';
import { PortModule } from './ports/port.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ProjectModule,
    RepositoryModule,
    DeploymentModule,
    ContainerModule,
    PortModule,
  ],
  controllers: [AppController],
  providers: [AppService, RestoreDeploymentPortReservationsService],
})
export class AppModule {}
