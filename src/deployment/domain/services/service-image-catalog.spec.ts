import { lookupImage, normalizeImageRef } from './service-image-catalog.js';
import { ServiceType } from '../value-objects/service-type.js';

describe('service image catalog', () => {
  it.each([
    ['docker.io/library/postgres:16-alpine@sha256:abc123', 'postgres'],
    ['mcr.microsoft.com/mssql/server:2022-latest', 'mssql/server'],
    ['localhost:5000/miorg/billing:3445de0', 'miorg/billing'],
    ['registry.example.com:5000/bitnami/redis:7', 'bitnami/redis'],
    ['  POSTGRES:16  ', 'postgres'],
    ['pgvector/pgvector:pg16', 'pgvector/pgvector'],
  ])('normalizes %s to %s', (reference, expected) => {
    expect(normalizeImageRef(reference)).toBe(expected);
  });

  it('finds database images using their full references', () => {
    expect(lookupImage('docker.io/library/postgres:16')?.candidates).toEqual([
      ServiceType.DATABASE,
    ]);
    expect(
      lookupImage('mcr.microsoft.com/mssql/server:2022-latest')?.candidates,
    ).toEqual([ServiceType.DATABASE]);
  });

  it('preserves multiple candidates for ambiguous images', () => {
    expect(lookupImage('redis:7')?.candidates).toEqual([
      ServiceType.CACHE,
      ServiceType.MESSAGE_BROKER,
    ]);
    expect(lookupImage('nginx:alpine')?.candidates).toEqual([
      ServiceType.REVERSE_PROXY,
      ServiceType.FRONTEND,
    ]);
  });

  it('distinguishes known tools from images outside the catalog', () => {
    expect(lookupImage('dpage/pgadmin4:latest')?.candidates).toEqual([
      ServiceType.UNKNOWN,
    ]);
    expect(lookupImage('miorg/billing:latest')).toBeUndefined();
    expect(lookupImage('miorg/postgres:16')).toBeUndefined();
  });
});
