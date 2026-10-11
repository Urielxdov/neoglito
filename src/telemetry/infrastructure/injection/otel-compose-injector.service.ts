import { Injectable } from '@nestjs/common';
import { isRecord } from '../../../shared/application/compose-ports.js';
import {
  deploymentCollectorEndpoint,
  isAutoInstrumentationEnabled,
} from '../../application/telemetry-config.js';
import {
  INJECTED_SERVICE_PREFIX,
  type TelemetryInjectionContext,
  type TelemetryInjectorPort,
} from '../../application/ports/telemetry-injector.port.js';
import {
  autoInstrumentationFor,
  type AutoInstrumentationAgent,
} from './auto-instrumentation-catalog.js';
import { detectServiceRuntime } from './service-runtime-detector.js';

const HOST_GATEWAY = 'host.docker.internal:host-gateway';

type Environment = Record<string, unknown>;

/** Normaliza `environment` (lista `K=V` o mapa) a un mapa; las claves sin valor quedan en null. */
function readEnvironment(service: Record<string, unknown>): Environment {
  const environment: Environment = Object.create(null) as Environment;
  if (Array.isArray(service.environment)) {
    for (const entry of service.environment as unknown[]) {
      if (typeof entry !== 'string') continue;
      const separator = entry.indexOf('=');
      environment[separator < 0 ? entry : entry.slice(0, separator)] =
        separator < 0 ? null : entry.slice(separator + 1);
    }
  } else if (isRecord(service.environment)) {
    Object.assign(environment, service.environment);
  }
  return environment;
}

function setDefault(environment: Environment, key: string, value: string) {
  if (!Object.hasOwn(environment, key)) environment[key] = value;
}

/** Anexa a una variable existente (NODE_OPTIONS, PYTHONPATH…) o la crea. */
function mergeVariable(
  environment: Environment,
  key: string,
  value: string,
  separator: ' ' | ':' | ',',
) {
  const current = environment[key];
  if (typeof current !== 'string' || current === '') {
    setDefault(environment, key, value);
    return;
  }
  if (!current.includes(value))
    environment[key] = `${current}${separator}${value}`;
}

function addExtraHost(service: Record<string, unknown>) {
  const hosts = service.extra_hosts;
  if (Array.isArray(hosts)) {
    const entries = hosts as unknown[];
    const defined = entries.some(
      (entry) =>
        typeof entry === 'string' && /^host\.docker\.internal[:=]/.test(entry),
    );
    if (!defined) service.extra_hosts = [...entries, HOST_GATEWAY];
  } else if (isRecord(hosts)) {
    if (!Object.hasOwn(hosts, 'host.docker.internal'))
      service.extra_hosts = {
        ...hosts,
        'host.docker.internal': 'host-gateway',
      };
  } else {
    service.extra_hosts = [HOST_GATEWAY];
  }
}

function addInitDependency(service: Record<string, unknown>, init: string) {
  const dependsOn: Record<string, unknown> = {};
  if (Array.isArray(service.depends_on)) {
    for (const name of service.depends_on as unknown[])
      if (typeof name === 'string')
        dependsOn[name] = { condition: 'service_started' };
  } else if (isRecord(service.depends_on)) {
    Object.assign(dependsOn, service.depends_on);
  }
  dependsOn[init] = { condition: 'service_completed_successfully' };
  service.depends_on = dependsOn;
}

function addAgentVolume(
  document: Record<string, unknown>,
  services: Record<string, unknown>,
  agent: AutoInstrumentationAgent,
) {
  const volume = `neoglito-otel-${agent.variant}`;
  const init = `${INJECTED_SERVICE_PREFIX}${agent.variant}`;
  if (!Object.hasOwn(services, init)) {
    services[init] = {
      image: agent.image,
      // El volumen nuevo pertenece a root; la imagen del agente no corre como root.
      user: '0',
      command: [...agent.copyCommand],
      volumes: [`${volume}:${agent.mountPath}`],
      restart: 'no',
    };
  }
  const volumes = isRecord(document.volumes) ? document.volumes : {};
  if (!Object.hasOwn(volumes, volume)) volumes[volume] = {};
  document.volumes = volumes;
  return { volume, init };
}

/**
 * Inyecta en un Compose ya parseado la configuración OpenTelemetry de cada
 * servicio de aplicación: variables OTEL_*, `extra_hosts` hacia el host y, si
 * el lenguaje se detecta con certeza, el agente de auto-instrumentación.
 * Nunca pisa una clave que el Compose original o el usuario ya definieron.
 */
@Injectable()
export class OtelComposeInjector implements TelemetryInjectorPort {
  async inject(
    document: Record<string, unknown>,
    context: TelemetryInjectionContext,
  ): Promise<void> {
    if (!isRecord(document.services)) return;
    const services = document.services;
    const endpoint = deploymentCollectorEndpoint();
    const withAgents = isAutoInstrumentationEnabled();
    const resourceAttributes = [
      `neoglito.deployment.id=${context.deploymentId}`,
      ...(context.projectId === undefined
        ? []
        : [`neoglito.project.id=${context.projectId}`]),
    ].join(',');

    for (const [name, service] of Object.entries({ ...services })) {
      if (!isRecord(service)) continue;
      const inspection = await detectServiceRuntime(
        service,
        context.projectDirectory,
      );
      if (!inspection.instrumentable) continue;

      const environment = readEnvironment(service);
      setDefault(environment, 'OTEL_EXPORTER_OTLP_ENDPOINT', endpoint);
      setDefault(environment, 'OTEL_EXPORTER_OTLP_PROTOCOL', 'http/protobuf');
      // %20: el valor de OTEL_EXPORTER_OTLP_HEADERS sigue el formato W3C Baggage.
      setDefault(
        environment,
        'OTEL_EXPORTER_OTLP_HEADERS',
        `authorization=Bearer%20${context.token}`,
      );
      setDefault(environment, 'OTEL_SERVICE_NAME', name);
      mergeVariable(
        environment,
        'OTEL_RESOURCE_ATTRIBUTES',
        resourceAttributes,
        ',',
      );
      for (const signal of ['TRACES', 'METRICS', 'LOGS'])
        setDefault(environment, `OTEL_${signal}_EXPORTER`, 'otlp');

      const agent = withAgents
        ? autoInstrumentationFor(inspection.runtime, inspection.musl)
        : null;
      if (agent) {
        const { volume, init } = addAgentVolume(document, services, agent);
        const mounts = Array.isArray(service.volumes)
          ? [...(service.volumes as unknown[])]
          : [];
        mounts.push(`${volume}:${agent.mountPath}:ro`);
        service.volumes = mounts;
        addInitDependency(service, init);
        for (const variable of agent.environment) {
          if (variable.mergeWith)
            mergeVariable(
              environment,
              variable.key,
              variable.value,
              variable.mergeWith,
            );
          else setDefault(environment, variable.key, variable.value);
        }
      }

      service.environment = environment;
      addExtraHost(service);
    }
  }
}
