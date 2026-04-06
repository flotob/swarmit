import { useQuery, keepPreviousData } from '@tanstack/vue-query'
import { computed } from 'vue'
import { useCuratorDeclarations, getCuratorPref } from './useCurators.js'
import { useViewsStore, GLOBAL_SCOPE } from '../stores/views.js'
import { fetchGlobalIndex, resolveCuratorProfile } from '../swarm/feeds.js'
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

      const preferred = getCuratorPref('_global')
      const ordered = preferred
        ? [preferred, ...curatorList.map((c) => c.curator).filter((a) => a.toLowerCase() !== preferred.toLowerCase())]
        : curatorList.map((c) => c.curator)

      for (const addr of ordered) {
        const match = curatorList.find((c) => c.curator.toLowerCase() === addr.toLowerCase())
        if (!match) continue

        try {
          const profile = await resolveCuratorProfile(match.curatorProfileRef)
          if (!profile?.globalIndexFeed) continue

          const globalIndex = await fetchGlobalIndex(profile, viewId.value)
          if (!globalIndex?.entries?.length) continue
          const { valid: indexValid } = validate(globalIndex)
          if (!indexValid) continue

          const capped = globalIndex.entries.slice(0, MAX_ENTRIES)
          const entries = await resolveEntries(capped)

          views.setAvailableViews(GLOBAL_SCOPE, profile?.globalViewFeeds, profile?.globalIndexFeed)

          return {
            entries,
            curatorAddress: addr,
            curatorProfile: profile,
            updatedAt: globalIndex.updatedAt,
          }
        } catch {
          continue
        }
      }

      return null
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
