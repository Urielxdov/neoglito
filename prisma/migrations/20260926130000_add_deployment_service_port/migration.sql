ALTER TABLE "DeploymentService"
ADD COLUMN "port" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "DeploymentService"
ALTER COLUMN "port" DROP DEFAULT;

CREATE INDEX "DeploymentService_status_idx"
ON "DeploymentService"("status");
