export const ServiceType = {
  BACKEND: 'BACKEND',
  FRONTEND: 'FRONTEND',
  DATABASE: 'DATABASE',
  CACHE: 'CACHE',
  MESSAGE_BROKER: 'MESSAGE_BROKER',
  WORKER: 'WORKER',
  SCHEDULER: 'SCHEDULER',
  REVERSE_PROXY: 'REVERSE_PROXY',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ServiceType = (typeof ServiceType)[keyof typeof ServiceType];
