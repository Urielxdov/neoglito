export const COMPOSE_PORT_EXTRACT_PORT = Symbol('COMPOSE_PORT_EXTRACT_PORT');

export interface ComposePort {
  service: string;
  hostIp: string | null;
  publishedPort: string | null;
  targetPort: string;
  protocol: string;
  mappingType: 'one-to-one' | 'range';
}

export interface ComposePortAnalysis {
  ports: ComposePort[];
}

export interface ComposePortExtractPort {
  analyze(filePath: string): Promise<ComposePortAnalysis>;
}
