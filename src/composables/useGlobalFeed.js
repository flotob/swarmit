import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { useCuratorDeclarations, getCuratorPref } from './useCurators.js'
import { fetchGlobalIndex } from '../swarm/feeds.js'
import { fetchObject, resolveEntries } from '../swarm/fetch.js'
import { validate } from '../protocol/objects.js'

const MAX_ENTRIES = 30

/**
 * Fetch a curator's global cross-board feed.
 * Selects a curator (user preference or first available), resolves their
 * globalIndexFeed, then bulk-fetches submission + content for each entry.
 */
export function useGlobalFeed() {
  const { data: curators } = useCuratorDeclarations()

  const curatorKey = computed(() =>
    (curators.value || []).map((c) => c.curator.toLowerCase()).sort()
  )

  const globalQuery = useQuery({
    queryKey: ['globalFeed', curatorKey],
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
          const profile = await fetchObject(match.curatorProfileRef)
          if (!profile?.globalIndexFeed) continue
          const { valid: profileValid } = validate(profile)
          if (!profileValid) continue

          const globalIndex = await fetchGlobalIndex(profile)
          if (!globalIndex?.entries?.length) continue
          const { valid: indexValid } = validate(globalIndex)
          if (!indexValid) continue

          const capped = globalIndex.entries.slice(0, MAX_ENTRIES)
          const entries = await resolveEntries(capped)

          return {
            entries,
            curatorAddress: addr,
            curatorProfile: profile,
            wasPreferred: preferred?.toLowerCase() === addr.toLowerCase(),
            updatedAt: globalIndex.updatedAt,
          }
        } catch {
          continue
        }
      }

      return null
    },
    enabled: computed(() => !!curators.value?.length),
    staleTime: 30_000,
  })

  const selectedCurator = computed(() => {
    const data = globalQuery.data.value
    if (!data) return null
    return { address: data.curatorAddress, profile: data.curatorProfile }
  })

  const showCuratorBanner = computed(() => {
    const data = globalQuery.data.value
    return !!data && !data.wasPreferred
  })

  return {
    feed: globalQuery.data,
    isLoading: globalQuery.isLoading,
    isError: globalQuery.isError,
    error: globalQuery.error,
    selectedCurator,
    showCuratorBanner,
  }
}
