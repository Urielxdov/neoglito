import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import type {
  ComposeAnalysis,
  EnviromentVariableExtractPort,
  EnvironmentVariable,
} from '../../application/enviroment-variable-extract.port.js';

interface InterpolationExpression {
  variableName: string;
  defaultValue: string | null;
}

type YamlRecord = Record<string, unknown>;

@Injectable()
export class YamlComposeEnviromentVariableExtractService implements EnviromentVariableExtractPort {
  async analyze(filePath: string): Promise<ComposeAnalysis> {
    const fileContent = await readFile(filePath, 'utf8');
    const composeFile = parse(fileContent) as unknown;
    const environmentVariables = this.extractEnvironmentVariables(composeFile);

    return { environmentVariables };
  }

  private extractEnvironmentVariables(
    composeFile: unknown,
  ): EnvironmentVariable[] {
    if (!this.isRecord(composeFile) || !this.isRecord(composeFile.services)) {
      return [];
    }

    return Object.entries(composeFile.services).flatMap(
      ([service, serviceDefinition]) => {
        if (!this.isRecord(serviceDefinition)) {
          return [];
        }

        return this.extractServiceEnvironmentVariables(
          service,
          serviceDefinition.environment,
        );
      },
    );
  }

  private extractServiceEnvironmentVariables(
    service: string,
    environment: unknown,
  ): EnvironmentVariable[] {
    if (Array.isArray(environment)) {
      return environment.flatMap((entry) =>
        this.extractEnvironmentVariableFromListEntry(service, entry),
      );
    }

    if (this.isRecord(environment)) {
      return Object.entries(environment).flatMap(([name, value]) =>
        this.extractEnvironmentVariableFromMapEntry(service, name, value),
      );
    }

    return [];
  }

  private extractEnvironmentVariableFromListEntry(
    service: string,
    entry: unknown,
  ): EnvironmentVariable[] {
    if (typeof entry !== 'string') {
      return [];
    }

    const separatorIndex = entry.indexOf('=');

    if (separatorIndex === -1) {
      return [
        {
          service,
          name: entry,
          source: 'interpolation',
          value: entry,
          defaultValue: null,
        },
      ];
    }

    const name = entry.slice(0, separatorIndex);
    const value = entry.slice(separatorIndex + 1);

    return [this.toEnvironmentVariable(service, name, value)];
  }

  private extractEnvironmentVariableFromMapEntry(
    service: string,
    name: string,
    value: unknown,
  ): EnvironmentVariable[] {
    const serializedValue = this.serializeEnvironmentValue(value);

    return [this.toEnvironmentVariable(service, name, serializedValue)];
  }

  private toEnvironmentVariable(
    service: string,
    name: string,
    value: string | null,
  ): EnvironmentVariable {
    if (value === null) {
      return {
        service,
        name,
        source: 'interpolation',
        value: name,
        defaultValue: null,
      };
    }

    const interpolation = this.parseInterpolationExpression(value);

    if (interpolation) {
      return {
        service,
        name,
        source: 'interpolation',
        value: interpolation.variableName,
        defaultValue: interpolation.defaultValue,
      };
    }

    return {
      service,
      name,
      source: 'literal',
      value,
      defaultValue: null,
    };
  }

  private parseInterpolationExpression(
    value: string,
  ): InterpolationExpression | null {
    const bracedExpression =
      /\$\{([a-zA-Z_][a-zA-Z0-9_]*)(?:(:-|-|:\?|\?)([^}]*))?\}/.exec(value);

    if (bracedExpression) {
      const [, variableName, operator, operatorValue] = bracedExpression;

      return {
        variableName,
        defaultValue:
          operator === ':-' || operator === '-' ? (operatorValue ?? '') : null,
      };
    }

    const unbracedExpression = /^\$([a-zA-Z_][a-zA-Z0-9_]*)$/.exec(value);

    if (unbracedExpression) {
      return {
        variableName: unbracedExpression[1],
        defaultValue: null,
      };
    }

    return null;
  }

  private serializeEnvironmentValue(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return String(value);
    }

    return null;
  }

  private isRecord(value: unknown): value is YamlRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
