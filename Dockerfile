FROM node:22-alpine

RUN apk add --no-cache git docker-cli

WORKDIR /app

COPY package*.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm ci

COPY . .

EXPOSE 3000
CMD ["npm", "run", "start:dev"]
