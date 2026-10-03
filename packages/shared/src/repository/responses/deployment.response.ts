import type { IsoDateString } from '@neoglito/shared/api'

export interface DeploymentServiceResponse {
  id: string
  composeServiceName: string
  port: number
  status: string
  health: string
  lastObservedAt: IsoDateString
  deploymentId: string
}

export interface DeploymentResponse {
  id: string
  projectId: number
  composePath: string
  status: string
  createdAt: IsoDateString
  startedAt: IsoDateString | null
  finishedAt: IsoDateString | null
  services: DeploymentServiceResponse[]
}
