export const ServiceRuntime = {
  NODE: 'NODE',
  JAVA: 'JAVA',
  PYTHON: 'PYTHON',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ServiceRuntime =
  (typeof ServiceRuntime)[keyof typeof ServiceRuntime];
