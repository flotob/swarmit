import { useQuery } from '@tanstack/vue-query'
import { computed, ref } from 'vue'
import { useCuratorDeclarations, getCuratorPref } from './useCurators.js'
import { fetchGlobalIndex } from '../swarm/feeds.js'
import { fetchObject } from '../swarm/fetch.js'
import { validate } from '../protocol/objects.js'

const MAX_ENTRIES = 30

/**
 * Fetch a curator's global cross-board feed.
 * Selects a curator (user preference or first available), resolves their
 * globalIndexFeed, then bulk-fetches submission + content for each entry.
 */
export function useGlobalFeed() {
  const { data: curators } = useCuratorDeclarations()

  const selectedCurator = ref(null)
  const showCuratorBanner = ref(false)

  const globalQuery = useQuery({
    queryKey: ['globalFeed', computed(() => curators.value?.length ?? 0)],
    queryFn: async () => {
      const curatorList = curators.value || []
      if (!curatorList.length) return null

      // Try preferred global curator first, then fall back to any with a feed
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

          selectedCurator.value = { address: addr, profile }
          showCuratorBanner.value = !preferred || preferred.toLowerCase() !== addr.toLowerCase()

          // Bulk-fetch submissions + content, capped, drop malformed individually
          const capped = globalIndex.entries.slice(0, MAX_ENTRIES)
          const entries = (await Promise.all(
            capped.map(async (entry) => {
              try {
                const submission = await fetchObject(entry.submissionRef)
                const subResult = validate(submission)
                if (!subResult.valid) return null

                const content = submission?.contentRef ? await fetchObject(submission.contentRef) : null
                if (content) {
                  const contentResult = validate(content)
                  if (!contentResult.valid) return null
                }
                return { ...entry, submission, content }
              } catch {
                return null
              }
            })
          )).filter(Boolean)

          return { entries, curator: addr, updatedAt: globalIndex.updatedAt }
        } catch {
          continue
        }
      }

      return null
    },
    enabled: computed(() => !!curators.value?.length),
    staleTime: 30_000,
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
