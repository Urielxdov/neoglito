import { Inject, Injectable } from '@nestjs/common';
import { CONTAINER_RUNTIME_PORT } from '../../../container/application/container-runtime.port.js';
import type {
  ContainerInspection,
  ContainerRuntimePort,
} from '../../../container/application/container-runtime.port.js';
import type {
  ContainerClassification,
  ContainerClassificationPort,
  ContainerContext,
} from '../../application/container-classification.port.js';
import { CONTAINER_PROBE_PORT } from '../../application/container-probe.port.js';
import type { ContainerProbePort } from '../../application/container-probe.port.js';
import { classify } from './classification.js';
import { brokerUsageDiscriminator } from './discriminator-broker.js';
import { commandDiscriminator } from './discriminator-command.js';
import { httpFingerprintDiscriminator } from './discriminator-http.js';
import { webServerConfigDiscriminator } from './discriminator-webserver.js';
import { discriminationHandler } from './discrimination.js';
import { imageHandler } from './handler-image.js';
import { protocolHandlerWith } from './handler-protocol.js';

@Injectable()
export class ContainerClassificationService implements ContainerClassificationPort {
  constructor(
    @Inject(CONTAINER_PROBE_PORT) private readonly probe: ContainerProbePort,
    @Inject(CONTAINER_RUNTIME_PORT)
    private readonly runtime: ContainerRuntimePort,
  ) {}

  async classify(
    containers: readonly ContainerInspection[],
  ): Promise<ContainerClassification[]> {
    const host = process.env.CONTAINER_PROBE_HOST ?? '127.0.0.1';
    const contexts: ContainerContext[] = containers.map((container) => ({
      id: container.containerId,
      image: container.image,
      host,
      aliases: container.aliases,
      ports: container.ports,
      command: container.command,
      env: container.env,
    }));

    const handlers = [
      imageHandler,
      protocolHandlerWith(this.probe),
      discriminationHandler([
        httpFingerprintDiscriminator,
        webServerConfigDiscriminator({
          read: (ctx, path) => this.runtime.readFile(ctx.id, path),
          list: (ctx, dir) => this.runtime.listFiles(ctx.id, dir),
        }),
        brokerUsageDiscriminator(contexts),
        commandDiscriminator,
      ]),
    ];

    return Promise.all(
      contexts.map(async (ctx) => ({
        containerId: ctx.id,
        classification: await classify(ctx, handlers),
      })),
    );
  }
}
