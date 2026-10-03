import { Controller, Get, Inject } from '@nestjs/common';
import type { PortReservationsResponse } from '@neoglito/shared/ports';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PORT_RESERVATION_PORT } from '../application/port-reservation.port.js';
import type { PortReservationPort } from '../application/port-reservation.port.js';
import { ApiSuccessResponseDoc } from '../../shared/presentation/swagger/api-response.schemas.js';

@ApiTags('Port')
@Controller('port')
export class PortController {
  constructor(
    @Inject(PORT_RESERVATION_PORT)
    private readonly portReservation: PortReservationPort,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obtiene todos los puertos reservados' })
  @ApiSuccessResponseDoc({
    status: 200,
    description: 'Relación de claves de propietario con claves de puerto reservado',
    dataSchema: {
      type: 'object',
      additionalProperties: { type: 'string' },
      example: {
        'port-reservation:owner:container-123': 'port-reservation:port:3000',
      },
    },
  })
  async availablePorts(): Promise<PortReservationsResponse> {
    return this.portReservation.getAll()
  }
}
