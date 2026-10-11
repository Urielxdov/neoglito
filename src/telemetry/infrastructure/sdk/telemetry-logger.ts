import { ConsoleLogger } from '@nestjs/common';
import { SeverityNumber, logs } from '@opentelemetry/api-logs';

const SEVERITIES = {
  verbose: [SeverityNumber.TRACE, 'TRACE'],
  debug: [SeverityNumber.DEBUG, 'DEBUG'],
  log: [SeverityNumber.INFO, 'INFO'],
  warn: [SeverityNumber.WARN, 'WARN'],
  error: [SeverityNumber.ERROR, 'ERROR'],
  fatal: [SeverityNumber.FATAL, 'FATAL'],
} as const;

type Level = keyof typeof SEVERITIES;

/**
 * Logger de Nest que, además de la consola, emite LogRecords de OpenTelemetry.
 * El trace_id/span_id del contexto activo se adjuntan automáticamente. Sin SDK
 * iniciado el logger global de OTel es un no-op.
 */
export class TelemetryLogger extends ConsoleLogger {
  log(message: unknown, ...optionalParams: unknown[]): void {
    super.log(message, ...optionalParams);
    this.emit('log', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    super.error(message, ...optionalParams);
    this.emit('error', message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    super.warn(message, ...optionalParams);
    this.emit('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    super.debug(message, ...optionalParams);
    this.emit('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    super.verbose(message, ...optionalParams);
    this.emit('verbose', message, optionalParams);
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    super.fatal(message, ...optionalParams);
    this.emit('fatal', message, optionalParams);
  }

  private emit(level: Level, message: unknown, params: unknown[]): void {
    if (!this.isLevelEnabled(level)) return;
    const [severityNumber, severityText] = SEVERITIES[level];
    // Nest pasa el contexto (nombre de la clase) como último parámetro de texto.
    const last = params[params.length - 1];
    const context = typeof last === 'string' ? last : undefined;
    logs.getLogger('neoglito-api').emit({
      severityNumber,
      severityText,
      body:
        typeof message === 'string'
          ? message
          : message instanceof Error
            ? message.message
            : JSON.stringify(message),
      attributes: context ? { 'nestjs.context': context } : {},
    });
  }
}
