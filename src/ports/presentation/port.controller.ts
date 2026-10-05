import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { PortReservationsResponse } from '@neoglito/shared/ports';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/passport/jwt-auth.guard.js';
import { PORT_RESERVATION_PORT } from '../application/port-reservation.port.js';
import type { PortReservationPort } from '../application/port-reservation.port.js';
import {
  DRAFT_PORT_TTL_SECONDS,
  draftPortOwnerId,
} from '../application/draft-port-owner.js';
import { ReservePortDto } from '../application/dto/reserve-port.dto.js';
import { ApiSuccessResponseDoc } from '../../shared/presentation/swagger/api-response.schemas.js';

function assertValidPort(port: number): void {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new BadRequestException('El puerto debe ser un entero entre 1 y 65535');
  }
}

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

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiOperation({
    summary: 'Reserva provisionalmente un puerto para un proyecto',
    description: `La reserva expira sola a los ${DRAFT_PORT_TTL_SECONDS / 60} minutos. Al desplegar el proyecto pasa al despliegue.`,
  })
  @ApiBody({ type: ReservePortDto })
  @ApiConflictResponse({
    description: 'El puerto ya está reservado o está en uso en el servidor',
  })
  @ApiSuccessResponseDoc({
    status: 201,
    description: 'Puerto reservado',
    dataSchema: {
      type: 'object',
      properties: {
        port: { type: 'number', example: 5173 },
        ownerId: { type: 'string', example: 'draft:1:port:5173' },
      },
    },
  })
  async reserve(
    @Body() dto: ReservePortDto,
  ): Promise<{ port: number; ownerId: string }> {
    assertValidPort(dto.port);
    if (!Number.isInteger(dto.projectId)) {
      throw new BadRequestException('projectId debe ser un entero');
    }

    const ownerId = draftPortOwnerId(dto.projectId, dto.port);
    const reserved = await this.portReservation.reservePort(
      dto.port,
      ownerId,
      DRAFT_PORT_TTL_SECONDS,
    );
    if (!reserved) {
      throw new ConflictException(`El puerto ${dto.port} no está disponible`);
    }

    return { port: dto.port, ownerId };
  }

  @Delete(':projectId/:port')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiOperation({
    summary: 'Libera una reserva provisional de puerto',
    description:
      'Solo libera reservas provisionales del proyecto; no afecta puertos de despliegues ni contenedores.',
  })
  @ApiParam({ name: 'projectId', type: Number, example: 1 })
  @ApiParam({ name: 'port', type: Number, example: 5173 })
  @ApiSuccessResponseDoc({
    status: 200,
    description: 'Resultado de la liberación',
    dataSchema: {
      type: 'object',
      properties: { released: { type: 'boolean' } },
    },
  })
  async release(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('port', ParseIntPipe) port: number,
  ): Promise<{ released: boolean }> {
    assertValidPort(port);

    return {
      released: await this.portReservation.releasePort(
        draftPortOwnerId(projectId, port),
      ),
    };
  }
}
