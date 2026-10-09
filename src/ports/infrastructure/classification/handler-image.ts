import { lookupImage } from '../../../deployment/domain/services/service-image-catalog.js';
import { ServiceType } from '../../../deployment/domain/value-objects/service-type.js';
import { narrowTo, type ClassificationHandler } from './classification.js';

export const imageHandler: ClassificationHandler = {
  async handle(ctx, candidates) {
    const rule = lookupImage(ctx.image);
    if (!rule) return { kind: 'pass' };

    const evidence = `imagen: ${rule.name}`;
    // Las herramientas conocidas del catálogo se resuelven explícitamente como UNKNOWN.
    if (
      rule.candidates.length === 1 &&
      rule.candidates[0] === ServiceType.UNKNOWN
    ) {
      return { kind: 'resolved', type: ServiceType.UNKNOWN, evidence };
    }
    return narrowTo(candidates, rule.candidates, evidence);
  },
};
