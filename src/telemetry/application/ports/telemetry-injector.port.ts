export const TELEMETRY_INJECTOR_PORT = Symbol('TELEMETRY_INJECTOR_PORT');

export interface TelemetryInjectionContext {
  readonly deploymentId: string;
  readonly projectId?: number;
  readonly token: string;
  /** Directorio del Compose original; resuelve contextos de build relativos. */
  readonly projectDirectory: string;
}

export interface TelemetryInjectorPort {
  /**
   * Modifica `services` (sección `services` del Compose ya parseada) para que
   * los servicios de aplicación envíen telemetría al collector. No pisa claves
   * ya definidas. Puede añadir servicios auxiliares y volúmenes al documento.
   */
  inject(
    document: Record<string, unknown>,
    context: TelemetryInjectionContext,
  ): Promise<void>;
}

/** Prefijo de los servicios auxiliares añadidos por el inyector. */
export const INJECTED_SERVICE_PREFIX = 'neoglito-otel-init-';
