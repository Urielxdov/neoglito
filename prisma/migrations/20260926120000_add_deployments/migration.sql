CREATE TYPE "DeploymentStatus" AS ENUM ('pending', 'building', 'starting', 'running', 'failed', 'stopping', 'stopped');
CREATE TYPE "ContainerStatus" AS ENUM ('created', 'running', 'paused', 'restarting', 'exited', 'dead');
CREATE TYPE "ContainerHealth" AS ENUM ('starting', 'healthy', 'unhealthy', 'none');

CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "composePath" TEXT NOT NULL,
    "status" "DeploymentStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeploymentService" (
    "id" TEXT NOT NULL,
    "composeServiceName" TEXT NOT NULL,
    "status" "ContainerStatus" NOT NULL,
    "health" "ContainerHealth" NOT NULL,
    "lastObservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deploymentId" TEXT NOT NULL,
    CONSTRAINT "DeploymentService_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Deployment_projectId_createdAt_idx" ON "Deployment"("projectId", "createdAt");
CREATE INDEX "DeploymentService_deploymentId_idx" ON "DeploymentService"("deploymentId");
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeploymentService" ADD CONSTRAINT "DeploymentService_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
