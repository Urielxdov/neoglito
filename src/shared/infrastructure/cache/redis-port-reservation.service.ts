import { Injectable, Logger } from '@nestjs/common'
import { createServer } from 'node:net'
import type { Server } from 'node:net'
import type {
  HeldPortReservation,
  PortReservationPort,
} from '../../application/port-reservation.port.js'
import { RedisConnection } from './redis-connection.service.js'

const RESERVE_SCRIPT = `
  local portOwner = redis.call('GET', KEYS[1])
  local ownerPort = redis.call('GET', KEYS[2])
  if portOwner == ARGV[1] and ownerPort == ARGV[2] then
    return 1
  end
  if portOwner or ownerPort then
    return 0
  end
  redis.call('SET', KEYS[1], ARGV[1])
  redis.call('SET', KEYS[2], ARGV[2])
  return 1
`

const RESTORE_SCRIPT = `
  local portOwner = redis.call('GET', KEYS[1])
  local ownerPort = redis.call('GET', KEYS[2])
  if portOwner == ARGV[1] and ownerPort == ARGV[2] then
    return 1
  end
  if portOwner or ownerPort then
    return 0
  end
  redis.call('SET', KEYS[1], ARGV[1])
  redis.call('SET', KEYS[2], ARGV[2])
  return 1
`

const RELEASE_SCRIPT = `
  local port = redis.call('GET', KEYS[1])
  if not port then
    return 0
  end
  local portKey = ARGV[1] .. port
  if redis.call('GET', portKey) ~= ARGV[2] then
    return 0
  end
  redis.call('DEL', portKey)
  redis.call('DEL', KEYS[1])
  return 1
`

@Injectable()
export class RedisPortReservationService implements PortReservationPort {
  private readonly logger = new Logger(RedisPortReservationService.name)
  private readonly heldPorts = new Map<string, HeldPort>()
  constructor(private readonly redis: RedisConnection) {}

  async reservePort(port: number, ownerId: string): Promise<boolean> {
    if (!Number.isInteger(port) || port < 1 || port > 65535 || !ownerId) {
      this.logger.error(
        `Failed to reserve port ${port} for owner ${ownerId}: invalid port or ownerId`,
      )
      return false
    }

    // Estandariza los valores para redis
    const portKey = this.portKey(port)
    const ownerKey = this.ownerKey(ownerId)
    const [portOwner, ownerPort] = await Promise.all([
      this.redis.client.get(portKey),
      this.redis.client.get(ownerKey),
    ])
    if (portOwner !== null || ownerPort !== null) {
      this.logger.error(
        `Failed to reserve port ${port} for owner ${ownerId}: port already reserved`,
      )
      return false
    }

    if (!(await this.isPortAvailable(port))) {
      this.logger.error(
        `Failed to reserve port ${port} for owner ${ownerId}: port is not available`,
      )
      return false
    }

    const result = await this.redis.client.eval(RESERVE_SCRIPT, {
      keys: [portKey, ownerKey],
      arguments: [ownerId, String(port)],
    })

    if (result !== 1) {
      this.logger.error(
        `Failed to reserve port ${port} for owner ${ownerId}: Redis reservation script returned ${result}`,
      )
      return false
    }

    return true
  }

  async holdPort(
    port: number,
    ownerId: string,
    timeoutMs = 30_000,
  ): Promise<HeldPortReservation | null> {
    if (!Number.isInteger(port) || port < 1 || port > 65535 || !ownerId) {
      this.logger.error(
        `Failed to hold port ${port} for owner ${ownerId}: invalid port or ownerId`,
      )
      return null
    }

    const portKey = this.portKey(port)
    const ownerKey = this.ownerKey(ownerId)

    const server = await this.openPortHold(port)
    if (!server) {
      this.logger.error(
        `Failed to hold port ${port} for owner ${ownerId}: port is not available`,
      )
      return null
    }

    const result = await this.redis.client.eval(RESERVE_SCRIPT, {
      keys: [portKey, ownerKey],
      arguments: [ownerId, String(port)],
    })

    if (result !== 1) {
      await this.closeServer(server)
      this.logger.error(
        `Failed to hold port ${port} for owner ${ownerId}: Redis reservation script returned ${result}`,
      )
      return null
    }

    const timeout = setTimeout(() => {
      void this.releaseHeldPort(ownerId, true)
    }, timeoutMs)
    const heldPort: HeldPort = { port, ownerId, server, timeout, handedOff: false }
    this.heldPorts.set(ownerId, heldPort)

    return {
      port,
      ownerId,
      handoff: async <T>(operation?: () => Promise<T>): Promise<T | void> => {
        await this.handoffHeldPort(ownerId)

        if (!operation) {
          return undefined
        }

        try {
          return await operation()
        } catch (error) {
          await this.releasePort(ownerId)
          throw error
        }
      },
      release: () => this.releaseHeldPort(ownerId, false),
    } as HeldPortReservation
  }

  async restorePort(port: number, ownerId: string): Promise<boolean> {
    if (!Number.isInteger(port) || port < 1 || port > 65535 || !ownerId) {
      return false
    }

    const result = await this.redis.client.eval(RESTORE_SCRIPT, {
      keys: [this.portKey(port), this.ownerKey(ownerId)],
      arguments: [ownerId, String(port)],
    })
    return result === 1
  }

  async releasePort(ownerId: string): Promise<boolean> {
    if (!ownerId) {
      return false
    }

    const heldPort = this.heldPorts.get(ownerId)
    if (heldPort) {
      clearTimeout(heldPort.timeout)
      this.heldPorts.delete(ownerId)

      if (!heldPort.handedOff) {
        await this.closeServer(heldPort.server)
      }
    }

    const result = await this.redis.client.eval(RELEASE_SCRIPT, {
      keys: [this.ownerKey(ownerId)],
      arguments: ['port-reservation:port:', ownerId],
    })
    return result === 1
  }

  /**
   * Se envia un numero de puerto para estandarizar el formato con el que esta en redis
   * @param port numero de puerto
   * @returns llave estandarizada para almacenar
   */
  private portKey(port: number): string {
    return `port-reservation:port:${port}`
  }

  /**
   * Se envia un numero de cotenedor para estandarizar el formato con el que esta en redis
   * @param ownerId id del contenedor propietario
   * @returns llave estandarizada para almacenar
   */
  private ownerKey(ownerId: string): string {
    return `port-reservation:owner:${ownerId}`
  }

  /**
   * Se intenta una conexion con el puerto para validar si esta disponible 
   * @param port puerto a identificar
   * @returns boolean - indicador si el puerto esta disponible
   */
  private isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = createServer()
      server.once('error', () => resolve(false))
      server.listen({ port, host: '0.0.0.0', exclusive: true }, () => {
        server.close((error) => resolve(!error))
      })
    })
  }

  private openPortHold(port: number): Promise<Server | null> {
    return new Promise((resolve) => {
      const server = createServer()
      server.once('error', () => resolve(null))
      server.listen({ port, host: '0.0.0.0', exclusive: true }, () => {
        resolve(server)
      })
    })
  }

  private async handoffHeldPort(ownerId: string): Promise<void> {
    const heldPort = this.heldPorts.get(ownerId)
    if (!heldPort || heldPort.handedOff) {
      return
    }

    clearTimeout(heldPort.timeout)
    heldPort.handedOff = true
    await this.closeServer(heldPort.server)
  }

  private async releaseHeldPort(
    ownerId: string,
    timedOut: boolean,
  ): Promise<boolean> {
    const heldPort = this.heldPorts.get(ownerId)
    if (heldPort) {
      clearTimeout(heldPort.timeout)
      this.heldPorts.delete(ownerId)

      if (!heldPort.handedOff) {
        await this.closeServer(heldPort.server)
      }

      if (timedOut) {
        this.logger.warn(
          `Port hold for owner ${ownerId} expired before handoff`,
        )
      }
    }

    return this.releasePort(ownerId)
  }

  private closeServer(server: Server): Promise<void> {
    return new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        resolve()
      })
    })
  }
}

interface HeldPort {
  port: number
  ownerId: string
  server: Server
  timeout: NodeJS.Timeout
  handedOff: boolean
}
