import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  detectServiceRuntime,
  finalStageImage,
} from './service-runtime-detector.js';
import { ServiceRuntime } from '../../domain/value-objects/service-runtime.js';

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'neoglito-runtime-'));
});

afterEach(() => rm(directory, { recursive: true, force: true }));

async function context(files: Record<string, string>) {
  await mkdir(join(directory, 'app'), { recursive: true });
  for (const [file, content] of Object.entries(files))
    await writeFile(join(directory, 'app', file), content);
  return './app';
}

describe('finalStageImage', () => {
  it('toma la última etapa y descarta bases con ARG', () => {
    expect(
      finalStageImage('FROM node:22 AS build\nFROM --platform=x nginx:1\n'),
    ).toBe('nginx:1');
    expect(finalStageImage('ARG BASE=node\nFROM $BASE\n')).toBeNull();
    expect(finalStageImage('RUN echo\n')).toBeNull();
  });
});

describe('detectServiceRuntime', () => {
  it.each([
    ['node:22-alpine', ServiceRuntime.NODE, true],
    ['python:3.12', ServiceRuntime.PYTHON, false],
    ['ghcr.io/acme/svc:1', ServiceRuntime.UNKNOWN, false],
    ['amazoncorretto:21', ServiceRuntime.JAVA, false],
  ])('detecta %s por imagen', async (image, runtime, musl) => {
    expect(await detectServiceRuntime({ image }, directory)).toEqual({
      instrumentable: true,
      runtime,
      musl,
    });
  });

  it('marca como no instrumentables las imágenes de infraestructura', async () => {
    for (const image of ['postgres:16', 'redis:8', 'nginx', 'rabbitmq:3'])
      expect(
        (await detectServiceRuntime({ image }, directory)).instrumentable,
      ).toBe(false);
  });

  it('usa los archivos marcadores cuando el Dockerfile no decide', async () => {
    const build = await context({
      'pom.xml': '',
      Dockerfile: 'ARG BASE\nFROM $BASE\n',
    });
    expect(await detectServiceRuntime({ build }, directory)).toMatchObject({
      runtime: ServiceRuntime.JAVA,
    });
  });

  it('no adivina si hay varios lenguajes en el contexto', async () => {
    const build = await context({ 'package.json': '{}', 'pom.xml': '' });
    expect(await detectServiceRuntime({ build }, directory)).toMatchObject({
      instrumentable: true,
      runtime: ServiceRuntime.UNKNOWN,
    });
  });

  it('la etapa final decide: build con Node servido por nginx no se instrumenta', async () => {
    const build = await context({
      'package.json': '{}',
      Dockerfile:
        'FROM node:22 AS build\nRUN npm run build\nFROM nginx:alpine\n',
    });
    expect(
      (await detectServiceRuntime({ build }, directory)).instrumentable,
    ).toBe(false);
  });

  it('no inspecciona contextos remotos', async () => {
    expect(
      await detectServiceRuntime(
        { build: 'https://github.com/acme/app.git' },
        directory,
      ),
    ).toMatchObject({ instrumentable: true, runtime: ServiceRuntime.UNKNOWN });
  });
});
