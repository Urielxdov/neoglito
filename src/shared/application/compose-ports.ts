import type { ComposePort } from './compose-port-extract.port.js';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Normaliza la sintaxis corta y larga sin resolver expresiones de Compose. */
export function parseComposePort(
  service: string,
  port: unknown,
): ComposePort | null {
  let targetPort: string;
  let publishedPort: string | null = null;
  let hostIp: string | null = null;
  let protocol = 'tcp';
  if (typeof port === 'string' || typeof port === 'number') {
    const [mapping, declaredProtocol] = String(port).split('/');
    protocol = declaredProtocol || 'tcp';
    const parts = mapping.split(':');
    targetPort = parts.at(-1) ?? '';
    if (parts.length > 1) publishedPort = parts.at(-2) || null;
    if (parts.length > 2) hostIp = parts.slice(0, -2).join(':') || null;
  } else if (
    isRecord(port) &&
    (typeof port.target === 'string' || typeof port.target === 'number') &&
    (port.published == null ||
      typeof port.published === 'string' ||
      typeof port.published === 'number')
  ) {
    targetPort = String(port.target);
    publishedPort = port.published == null ? null : String(port.published);
    hostIp = typeof port.host_ip === 'string' ? port.host_ip : null;
    protocol = typeof port.protocol === 'string' ? port.protocol : 'tcp';
  } else {
    return null;
  }
  if (!targetPort) return null;
  return {
    service,
    hostIp,
    publishedPort,
    targetPort,
    protocol,
    mappingType:
      /^\d+-\d+$/.test(publishedPort ?? '') || /^\d+-\d+$/.test(targetPort)
        ? 'range'
        : 'one-to-one',
  };
}
