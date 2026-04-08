import { useQuery, keepPreviousData } from '@tanstack/vue-query'
import { computed } from 'vue'
import { useCuratorDeclarations, getCuratorPref, resolveGlobalCurator } from './useCurators.js'
import { useViewsStore, GLOBAL_SCOPE } from '../stores/views.js'
import { fetchGlobalIndex } from '../swarm/feeds.js'
import { resolveEntries } from '../swarm/fetch.js'
import { validate } from '../protocol/objects.js'

const MAX_ENTRIES = 30

export function useGlobalFeed() {
  const { data: curators } = useCuratorDeclarations()
  const views = useViewsStore()

  const curatorKey = computed(() =>
    (curators.value || []).map((c) => c.curator.toLowerCase()).sort()
  )
  const globalPrefKey = computed(() => getCuratorPref('_global') || '_auto')
  const viewId = computed(() => views.getView(GLOBAL_SCOPE))

  const globalQuery = useQuery({
    queryKey: ['globalFeed', curatorKey, globalPrefKey, viewId],
    queryFn: async () => {
      const curatorList = curators.value || []
      if (!curatorList.length) return null

      return resolveGlobalCurator(curatorList, async (profile, addr) => {
        if (!profile?.globalIndexFeed) return null

        const globalIndex = await fetchGlobalIndex(profile, viewId.value)
        if (!globalIndex?.entries?.length) return null
        const { valid: indexValid } = validate(globalIndex)
        if (!indexValid) return null

        const capped = globalIndex.entries.slice(0, MAX_ENTRIES)
        const entries = await resolveEntries(capped)

        views.setAvailableViews(GLOBAL_SCOPE, profile?.globalViewFeeds, profile?.globalIndexFeed)

        return {
          entries,
          curatorAddress: addr,
          curatorProfile: profile,
          updatedAt: globalIndex.updatedAt,
        }
      })
    },
    enabled: computed(() => !!curators.value?.length),
    placeholderData: keepPreviousData,
    staleTime: 5_000,
    refetchInterval: 5_000,
  })

  const curatorAddress = computed(() => globalQuery.data.value?.curatorAddress ?? null)
  const curatorProfile = computed(() => globalQuery.data.value?.curatorProfile ?? null)

  return {
    feed: globalQuery.data,
    curators,
    isLoading: globalQuery.isLoading,
    isError: globalQuery.isError,
    error: globalQuery.error,
    curatorAddress,
    curatorProfile,
  }
}
