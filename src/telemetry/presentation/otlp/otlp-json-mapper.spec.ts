import { BadRequestException } from '@nestjs/common';
import {
  mapLogs,
  mapMetrics,
  mapTraces,
  nanosToDate,
} from './otlp-json-mapper.js';

const resource = {
  attributes: [
    { key: 'service.name', value: { stringValue: 'checkout' } },
    { key: 'neoglito.deployment.id', value: { stringValue: 'dep-1' } },
  ],
};

describe('nanosToDate', () => {
  it('convierte nanosegundos expresados como texto', () => {
    expect(nanosToDate('1700000000123456789')?.toISOString()).toBe(
      '2023-11-14T22:13:20.123Z',
    );
  });

  it('descarta valores vacíos, cero o inválidos', () => {
    expect(nanosToDate(undefined)).toBeNull();
    expect(nanosToDate('0')).toBeNull();
    expect(nanosToDate('abc')).toBeNull();
  });
});

describe('mapTraces', () => {
  const body = {
    resourceSpans: [
      {
        resource,
        scopeSpans: [
          {
            spans: [
              {
                traceId: 'a'.repeat(32),
                spanId: 'b'.repeat(16),
                parentSpanId: 'c'.repeat(16),
                name: 'GET /items',
                kind: 2,
                startTimeUnixNano: '1700000000000000000',
                endTimeUnixNano: '1700000000250000000',
                attributes: [
                  { key: 'http.status_code', value: { intValue: '200' } },
                  { key: 'cache', value: { boolValue: true } },
                  {
                    key: 'tags',
                    value: {
                      arrayValue: {
                        values: [{ stringValue: 'a' }, { doubleValue: 1.5 }],
                      },
                    },
                  },
                  {
                    key: 'nested',
                    value: {
                      kvlistValue: {
                        values: [{ key: 'k', value: { stringValue: 'v' } }],
                      },
                    },
                  },
                  { key: 'huge', value: { intValue: '9223372036854775807' } },
                ],
                status: { code: 2, message: 'boom' },
              },
              { name: 'sin identidad' },
            ],
          },
        ],
      },
    ],
  };

  it('mapea spans, atributos, duración y servicio', () => {
    const [span, ...rest] = mapTraces(body, 'dep-1');
    expect(rest).toEqual([]);
    expect(span).toMatchObject({
      deploymentId: 'dep-1',
      serviceName: 'checkout',
      traceId: 'a'.repeat(32),
      spanId: 'b'.repeat(16),
      parentSpanId: 'c'.repeat(16),
      name: 'GET /items',
      kind: 2,
      durationMs: 250,
      statusCode: 2,
      statusMessage: 'boom',
    });
    expect(span.attributes).toEqual({
      'http.status_code': 200,
      cache: true,
      tags: ['a', 1.5],
      nested: { k: 'v' },
      huge: '9223372036854775807',
    });
    expect(span.resource['service.name']).toBe('checkout');
  });

  it('acepta enums como nombre y usa un servicio por defecto', () => {
    const [span] = mapTraces(
      {
        resourceSpans: [
          {
            scopeSpans: [
              {
                spans: [
                  {
                    traceId: 'a'.repeat(32),
                    spanId: 'b'.repeat(16),
                    name: 'x',
                    kind: 'SPAN_KIND_CLIENT',
                    startTimeUnixNano: '1700000000000000000',
                    endTimeUnixNano: '1700000000000000000',
                    status: { code: 'STATUS_CODE_OK' },
                  },
                ],
              },
            ],
          },
        ],
      },
      null,
    );
    expect(span).toMatchObject({
      deploymentId: null,
      serviceName: 'unknown_service',
      kind: 3,
      statusCode: 1,
      durationMs: 0,
    });
  });

  it('rechaza cuerpos que no son objetos', () => {
    expect(() => mapTraces([], null)).toThrow(BadRequestException);
    expect(() => mapTraces('x', null)).toThrow(BadRequestException);
  });

  it('devuelve una lista vacía cuando no hay spans', () => {
    expect(mapTraces({}, null)).toEqual([]);
  });
});

describe('mapMetrics', () => {
  const time = '1700000000000000000';
  const body = {
    resourceMetrics: [
      {
        resource,
        scopeMetrics: [
          {
            metrics: [
              {
                name: 'queue.depth',
                unit: '{items}',
                gauge: {
                  dataPoints: [
                    {
                      timeUnixNano: time,
                      asInt: '7',
                      attributes: [{ key: 'q', value: { stringValue: 'a' } }],
                    },
                  ],
                },
              },
              {
                name: 'requests',
                sum: { dataPoints: [{ timeUnixNano: time, asDouble: 12.5 }] },
              },
              {
                name: 'latency',
                unit: 'ms',
                histogram: {
                  dataPoints: [
                    {
                      timeUnixNano: time,
                      count: '3',
                      sum: 30,
                      min: 5,
                      max: 15,
                      bucketCounts: ['1', '2', '0'],
                      explicitBounds: [10, 20],
                    },
                  ],
                },
              },
              {
                name: 'exp',
                exponentialHistogram: {
                  dataPoints: [
                    {
                      timeUnixNano: time,
                      count: '2',
                      sum: 4,
                      scale: 1,
                      zeroCount: '0',
                      positive: { offset: 0, bucketCounts: ['2'] },
                    },
                  ],
                },
              },
              {
                name: 'summary',
                summary: {
                  dataPoints: [
                    {
                      timeUnixNano: time,
                      count: '1',
                      sum: 2,
                      quantileValues: [{ quantile: 0.5, value: 2 }],
                    },
                  ],
                },
              },
              { name: 'sin-tiempo', gauge: { dataPoints: [{ asInt: '1' }] } },
              { gauge: { dataPoints: [{ timeUnixNano: time, asInt: '1' }] } },
            ],
          },
        ],
      },
    ],
  };

  it('mapea cada tipo de métrica a puntos', () => {
    const points = mapMetrics(body, 'dep-1');
    expect(
      points.map((point) => [point.name, point.type, point.value]),
    ).toEqual([
      ['queue.depth', 'gauge', 7],
      ['requests', 'sum', 12.5],
      ['latency', 'histogram', 30],
      ['exp', 'exponential_histogram', 4],
      ['summary', 'summary', 2],
    ]);
    expect(points[0]).toMatchObject({
      deploymentId: 'dep-1',
      serviceName: 'checkout',
      unit: '{items}',
      attributes: { q: 'a' },
    });
    expect(points[2].histogram).toEqual({
      count: 3,
      sum: 30,
      min: 5,
      max: 15,
      bucketCounts: [1, 2, 0],
      explicitBounds: [10, 20],
    });
  });
});

describe('mapLogs', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const body = {
    resourceLogs: [
      {
        resource,
        scopeLogs: [
          {
            logRecords: [
              {
                timeUnixNano: '1700000000000000000',
                severityNumber: 17,
                body: { stringValue: 'falló' },
                traceId: 'a'.repeat(32),
                spanId: 'b'.repeat(16),
                attributes: [{ key: 'k', value: { intValue: 1 } }],
              },
              {
                observedTimeUnixNano: '1700000001000000000',
                severityText: 'warn',
                body: { kvlistValue: { values: [] } },
              },
              { body: { stringValue: 'sin tiempo' } },
            ],
          },
        ],
      },
    ],
  };

  it('mapea severidad, cuerpo y correlación con la traza', () => {
    const [error, warn, untimed] = mapLogs(body, 'dep-1', () => now);
    expect(error).toMatchObject({
      deploymentId: 'dep-1',
      serviceName: 'checkout',
      severity: 'ERROR',
      body: 'falló',
      traceId: 'a'.repeat(32),
      spanId: 'b'.repeat(16),
      attributes: { k: 1 },
    });
    expect(warn).toMatchObject({
      severity: 'WARN',
      body: '{}',
      traceId: null,
    });
    expect(warn.time.toISOString()).toBe('2023-11-14T22:13:21.000Z');
    expect(untimed.time).toBe(now);
    expect(untimed.severity).toBe('UNSPECIFIED');
  });
});
