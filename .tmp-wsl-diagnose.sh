#!/usr/bin/env bash
set -euo pipefail

cd /mnt/c/Users/uriel/Documents/neoglito

echo "WSL_OK"
pwd

echo "--- Dockerfile ---"
sed -n '1,80p' Dockerfile

echo "--- .dockerignore ---"
sed -n '1,120p' .dockerignore

echo "--- docker npm ci simulation ---"
docker run --rm -v "$PWD:/src:ro" node:22-alpine sh -lc '
  set -e
  mkdir -p /app/apps/web /app/packages/shared
  cp /src/package*.json /app/
  cp /src/apps/web/package.json /app/apps/web/package.json
  cp /src/packages/shared/package.json /app/packages/shared/package.json
  cd /app
  npm ci --no-audit --no-fund --loglevel=notice
'
