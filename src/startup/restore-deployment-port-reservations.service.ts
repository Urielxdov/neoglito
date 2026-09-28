import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PORT_RESERVATION_PORT } from '../shared/application/port-reservation.port.js';
import type { PortReservationPort } from '../shared/application/port-reservation.port.js';

@Injectable()
export class RestoreDeploymentPortReservationsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(
    RestoreDeploymentPortReservationsService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PORT_RESERVATION_PORT)
    private readonly portReservation: PortReservationPort,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const services = await this.prisma.deploymentService.findMany({
      where: { status: { in: ['running', 'paused', 'restarting'] } },
      select: { id: true, port: true },
    });

    const conflicts: string[] = [];
    for (const service of services) {
      const restored = await this.portReservation.restorePort(
        service.port,
        service.id,
      );
      if (!restored) {
        conflicts.push(`${service.id} (puerto ${service.port})`);
      }
    }

    if (conflicts.length > 0) {
      throw new Error(
        `No se pudieron restaurar las reservas de puertos: ${conflicts.join(', ')}`,
      );
    }

    this.logger.log(
      `Reservas de puertos restauradas para ${services.length} contenedor(es) activo(s)`,
    );
  }
}
