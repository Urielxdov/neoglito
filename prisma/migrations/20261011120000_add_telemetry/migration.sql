-- CreateTable
CREATE TABLE "DeploymentTelemetryToken" (
    "id" TEXT NOT NULL,
    "deploymentId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "DeploymentTelemetryToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelemetrySpan" (
    "id" TEXT NOT NULL,
    "deploymentId" TEXT,
    "serviceName" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "spanId" TEXT NOT NULL,
    "parentSpanId" TEXT,
    "name" TEXT NOT NULL,
    "kind" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "durationMs" DOUBLE PRECISION NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "statusMessage" TEXT,
    "attributes" JSONB NOT NULL,
    "resource" JSONB NOT NULL,

    CONSTRAINT "TelemetrySpan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelemetryMetricPoint" (
    "id" TEXT NOT NULL,
    "deploymentId" TEXT,
    "serviceName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "type" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION,
    "histogram" JSONB,
    "attributes" JSONB NOT NULL,

    CONSTRAINT "TelemetryMetricPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelemetryLog" (
    "id" TEXT NOT NULL,
    "deploymentId" TEXT,
    "serviceName" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "severity" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "traceId" TEXT,
    "spanId" TEXT,
    "attributes" JSONB NOT NULL,

    CONSTRAINT "TelemetryLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeploymentTelemetryToken_deploymentId_key" ON "DeploymentTelemetryToken"("deploymentId");

-- CreateIndex
CREATE UNIQUE INDEX "DeploymentTelemetryToken_tokenHash_key" ON "DeploymentTelemetryToken"("tokenHash");

-- CreateIndex
CREATE INDEX "TelemetrySpan_deploymentId_startTime_idx" ON "TelemetrySpan"("deploymentId", "startTime");

-- CreateIndex
CREATE INDEX "TelemetrySpan_traceId_idx" ON "TelemetrySpan"("traceId");

-- CreateIndex
CREATE INDEX "TelemetrySpan_startTime_idx" ON "TelemetrySpan"("startTime");

-- CreateIndex
CREATE INDEX "TelemetryMetricPoint_deploymentId_name_time_idx" ON "TelemetryMetricPoint"("deploymentId", "name", "time");

-- CreateIndex
CREATE INDEX "TelemetryMetricPoint_time_idx" ON "TelemetryMetricPoint"("time");

-- CreateIndex
CREATE INDEX "TelemetryLog_deploymentId_time_idx" ON "TelemetryLog"("deploymentId", "time");

-- CreateIndex
CREATE INDEX "TelemetryLog_time_idx" ON "TelemetryLog"("time");

-- AddForeignKey
ALTER TABLE "DeploymentTelemetryToken" ADD CONSTRAINT "DeploymentTelemetryToken_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelemetrySpan" ADD CONSTRAINT "TelemetrySpan_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelemetryMetricPoint" ADD CONSTRAINT "TelemetryMetricPoint_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelemetryLog" ADD CONSTRAINT "TelemetryLog_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
