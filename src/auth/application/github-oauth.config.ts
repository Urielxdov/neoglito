const DEFAULT_BACKEND_URL = 'http://localhost:3000';

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

export function getGitHubClientId(): string {
  return requiredEnv('GITHUB_CLIENT_ID');
}

export function getGitHubClientSecret(): string {
  return requiredEnv('GITHUB_CLIENT_SECRET');
}

export function getGitHubCallbackUrl(): string {
  if (process.env.GITHUB_CALLBACK_URL) {
    return process.env.GITHUB_CALLBACK_URL;
  }

  const backendUrl = (process.env.BACKEND_URL ?? DEFAULT_BACKEND_URL).replace(
    /\/$/,
    '',
  );

  return `${backendUrl}/auth/github/callback`;
}
