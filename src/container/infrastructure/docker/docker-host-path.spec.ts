import { resolveDockerHostPath } from './docker-host-path.js';

it('translates the API checkout to the Windows directory shared with the daemon', () => {
  expect(
    resolveDockerHostPath('/app/repo/user/neoglito', [
      { type: 'bind', source: 'C:\\Users\\dev\\neoglito', destination: '/app' },
    ]),
  ).toBe('/run/desktop/mnt/host/c/Users/dev/neoglito/repo/user/neoglito');
});

it('uses the deepest mount and leaves Linux host sources intact', () => {
  expect(
    resolveDockerHostPath('/app/repo/user/src', [
      { type: 'bind', source: '/host/project', destination: '/app' },
      { type: 'bind', source: '/host/repositories', destination: '/app/repo' },
    ]),
  ).toBe('/host/repositories/user/src');
});

it('does not confuse paths with the same prefix or paths stored in an unshared volume', () => {
  const mounts = [
    { type: 'bind', source: '/host/project', destination: '/app' },
    {
      type: 'volume',
      source: '/var/lib/docker/volumes/deps/_data',
      destination: '/app/node_modules',
    },
  ];
  expect(() => resolveDockerHostPath('/application/repo', mounts)).toThrow(
    'no está compartida',
  );
  expect(() => resolveDockerHostPath('/app/node_modules/lib', mounts)).toThrow(
    'no está compartida',
  );
});
