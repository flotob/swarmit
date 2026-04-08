import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { useCuratorDeclarations, getCuratorPref, resolveGlobalCurator } from './useCurators.js'

/**
 * Resolve the global curator's board list.
 * Uses the same curator priority as useGlobalFeed but only extracts
 * boardFeeds slugs — does not resolve individual board feeds.
 */
export function useCuratorBoards() {
  const { data: curators } = useCuratorDeclarations()

  const curatorKey = computed(() =>
    (curators.value || []).map((c) => c.curator.toLowerCase()).sort()
  )
  const globalPrefKey = computed(() => getCuratorPref('_global') || '_auto')

  const boardsQuery = useQuery({
    queryKey: ['curatorBoards', curatorKey, globalPrefKey],
    queryFn: async () => {
      const curatorList = curators.value || []
      if (!curatorList.length) return null

      return resolveGlobalCurator(curatorList, (profile) => {
        const slugs = profile?.boardFeeds && Object.keys(profile.boardFeeds)
        if (!slugs?.length) return null
        return { boards: slugs, curatorName: profile.name || null }
      })
    },
    enabled: computed(() => !!curators.value?.length),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })

  const boards = computed(() => boardsQuery.data.value?.boards ?? [])
  const curatorName = computed(() => boardsQuery.data.value?.curatorName ?? null)

  return {
    boards,
    curatorName,
    isLoading: boardsQuery.isLoading,
    isError: boardsQuery.isError,
    error: boardsQuery.error,
  }
}
