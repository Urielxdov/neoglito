import { Injectable } from '@nestjs/common';
import { createServer } from 'node:net';
import type { PortReservationPort } from '../../application/port-reservation.port.js';
import { RedisConnection } from './redis-connection.service.js';

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
`;

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
`;

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
`;

@Injectable()
export class RedisPortReservationService implements PortReservationPort {
  constructor(private readonly redis: RedisConnection) {}

  async reservePort(port: number, ownerId: string): Promise<boolean> {
    if (!Number.isInteger(port) || port < 1 || port > 65535 || !ownerId) {
      return false;
    }

    const portKey = this.portKey(port);
    const ownerKey = this.ownerKey(ownerId);
    const [portOwner, ownerPort] = await Promise.all([
      this.redis.client.get(portKey),
      this.redis.client.get(ownerKey),
    ]);
    if (portOwner !== null || ownerPort !== null) {
      return false;
    }

    if (!(await this.isPortAvailable(port))) {
      return false;
    }

    const result = await this.redis.client.eval(RESERVE_SCRIPT, {
      keys: [portKey, ownerKey],
      arguments: [ownerId, String(port)],
    });
    return result === 1;
  }

  async restorePort(port: number, ownerId: string): Promise<boolean> {
    if (!Number.isInteger(port) || port < 1 || port > 65535 || !ownerId) {
      return false;
    }

    const result = await this.redis.client.eval(RESTORE_SCRIPT, {
      keys: [this.portKey(port), this.ownerKey(ownerId)],
      arguments: [ownerId, String(port)],
    });
    return result === 1;
  }

  async releasePort(ownerId: string): Promise<boolean> {
    if (!ownerId) {
      return false;
    }

    const result = await this.redis.client.eval(RELEASE_SCRIPT, {
      keys: [this.ownerKey(ownerId)],
      arguments: ['port-reservation:port:', ownerId],
    });
    return result === 1;
  }

  private portKey(port: number): string {
    return `port-reservation:port:${port}`;
  }

  private ownerKey(ownerId: string): string {
    return `port-reservation:owner:${ownerId}`;
  }

  private isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.listen({ port, host: '0.0.0.0', exclusive: true }, () => {
        server.close((error) => resolve(!error));
      });
    });
  }
}
