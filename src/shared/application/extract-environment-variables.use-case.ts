import { Inject, Injectable } from '@nestjs/common';
import {
  ENVIROMENT_VARIABLE_EXTRACT_PORT,
  type EnviromentVariableExtractPort,
  type EnvironmentVariable,
} from './enviroment-variable-extract.port.js';

export interface ComposeEnvironmentVariablesAnalysis {
  filePath: string;
  environmentVariables: EnvironmentVariable[];
}

@Injectable()
export class ExtractEnvironmentVariablesUseCase {
  constructor(
    @Inject(ENVIROMENT_VARIABLE_EXTRACT_PORT)
    private readonly enviromentVariableExtract: EnviromentVariableExtractPort,
  ) {}

  async execute(
    filePaths: string[],
  ): Promise<ComposeEnvironmentVariablesAnalysis[]> {
    return Promise.all(
      filePaths.map(async (filePath) => {
        const analysis = await this.enviromentVariableExtract.analyze(filePath);

        return {
          filePath,
          environmentVariables: analysis.environmentVariables,
        };
      }),
    );
  }
}
