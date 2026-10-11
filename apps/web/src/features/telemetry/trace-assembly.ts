import type { TelemetrySpanResponse } from '@neoglito/web/shared/api/contracts';

export const SPAN_STATUS_ERROR = 2;

export interface TraceSpan {
  span: TelemetrySpanResponse;
  depth: number;
  /** Inicio del span relativo al inicio de la traza. */
  offsetMs: number;
  isError: boolean;
}

export interface Trace {
  id: string;
  name: string;
  startMs: number;
  durationMs: number;
  hasError: boolean;
  /** Servicios que participan, en orden de aparición. */
  services: string[];
  /** Spans en orden de recorrido del árbol (padre antes que hijos). */
  spans: TraceSpan[];
}

function assembleTrace(id: string, rawSpans: TelemetrySpanResponse[]): Trace {
  const starts = new Map(
    rawSpans.map((span) => [span.spanId, Date.parse(span.startTime)]),
  );
  const byParent = new Map<string, TelemetrySpanResponse[]>();
  const roots: TelemetrySpanResponse[] = [];

  for (const span of rawSpans) {
    // Un padre ausente (página aún no cargada o span descartado) cuenta como raíz.
    if (span.parentSpanId && starts.has(span.parentSpanId)) {
      const siblings = byParent.get(span.parentSpanId) ?? [];
      siblings.push(span);
      byParent.set(span.parentSpanId, siblings);
    } else {
      roots.push(span);
    }
  }

  const startOf = (span: TelemetrySpanResponse) => starts.get(span.spanId) ?? 0;
  const byStart = (a: TelemetrySpanResponse, b: TelemetrySpanResponse) =>
    startOf(a) - startOf(b);

  const startMs = Math.min(...rawSpans.map(startOf));
  const endMs = Math.max(
    ...rawSpans.map((span) => Date.parse(span.endTime) || startOf(span)),
  );

  const ordered: TraceSpan[] = [];
  const walk = (span: TelemetrySpanResponse, depth: number) => {
    ordered.push({
      span,
      depth,
      offsetMs: startOf(span) - startMs,
      isError: span.statusCode === SPAN_STATUS_ERROR,
    });
    for (const child of (byParent.get(span.spanId) ?? []).sort(byStart)) {
      walk(child, depth + 1);
    }
  };
  roots.sort(byStart).forEach((root) => walk(root, 0));

  const services: string[] = [];
  for (const { span } of ordered) {
    if (!services.includes(span.serviceName)) services.push(span.serviceName);
  }

  return {
    id,
    name: ordered[0].span.name,
    startMs,
    durationMs: Math.max(endMs - startMs, 0),
    hasError: ordered.some((entry) => entry.isError),
    services,
    spans: ordered,
  };
}

/** Agrupa spans sueltos en trazas, de la más reciente a la más antigua. */
export function assembleTraces(spans: TelemetrySpanResponse[]): Trace[] {
  const unique = new Map<string, TelemetrySpanResponse>();
  for (const span of spans) unique.set(`${span.traceId}:${span.spanId}`, span);

  const byTrace = new Map<string, TelemetrySpanResponse[]>();
  for (const span of unique.values()) {
    const group = byTrace.get(span.traceId) ?? [];
    group.push(span);
    byTrace.set(span.traceId, group);
  }

  return [...byTrace.entries()]
    .map(([id, group]) => assembleTrace(id, group))
    .sort((a, b) => b.startMs - a.startMs);
}
