import type { IsoDateString } from '@neoglito/shared/api'

export interface DeploymentServiceResponse {
  id: string
  composeServiceName: string
  status: string
  health: string
  lastObservedAt: IsoDateString
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
