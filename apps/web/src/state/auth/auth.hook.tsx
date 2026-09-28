import { useQuery } from '@tanstack/react-query'
import { authService } from '../../services/auth.service'

export function useAuth() {
  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const response = await authService.getCurrentUser()

      if (!response.success || !response.data) {
        return null
      }

      return response.data
    },
  })

  return {
    user: query.data ?? null,
    status: query.isLoading ? 'loading' : query.data ? 'authenticated' : 'unauthenticated',
    isLoading: query.isLoading,
    isAuthenticated: Boolean(query.data),
    async refresh() {
      await query.refetch()
    },
  }
}
