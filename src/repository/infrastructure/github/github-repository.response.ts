export interface GitHubRepositoryResponse {
  id: number
  name: string
  full_name: string
  private: boolean
  description: string | null
  language: string | null
  updated_at: string
  git_url: string
  clone_url: string
}
