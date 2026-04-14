import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useAuthStore } from '../stores/auth'
import { useSubmissionsStore } from '../stores/submissions'
import { useSwarm } from './useSwarm.js'
import { readUserFeed } from '../swarm/userFeed.js'
import { STATUS } from '../lib/submission-status.js'

/**
 * Blends the local submissions store (in-session, rich status tracking)
 * with the on-chain user feed history (persistent, minimal entries).
 * Deduped by submissionRef — local store items win when both exist.
 */
export function useActivityFeed() {
  const auth = useAuthStore()
  const store = useSubmissionsStore()
  const swarm = useSwarm()

  const { data: feedEntries, isLoading: isFeedLoading } = useQuery({
    queryKey: ['userActivityFeed', computed(() => auth.userAddress)],
    queryFn: async () => {
      const { entries } = await readUserFeed(auth.userAddress, swarm, { maxEntries: 50 })
      return entries
    },
    enabled: computed(() => !!auth.userAddress),
    staleTime: 60_000,
    refetchInterval: 60_000,
  })

  const blended = computed(() => {
    const wallet = auth.userAddress?.toLowerCase()
    const myItems = wallet
      ? store.items.filter((i) => i.authorAddress?.toLowerCase() === wallet)
      : []

    const localRefs = new Set(myItems.map((i) => i.submissionRef))

    const historyItems = (feedEntries.value || [])
      .filter((e) => !localRefs.has(e.submissionRef))
      .map((e) => ({
        submissionRef: e.submissionRef,
        boardSlug: e.boardSlug,
        kind: e.kind,
        createdAt: e.createdAt,
        status: STATUS.SETTLED,
        curatorPickups: [],
        title: null,
      }))

    return [...myItems, ...historyItems]
  })

  const queued = computed(() =>
    blended.value.filter((i) =>
      i.status === STATUS.WAITING || i.status === STATUS.PUBLISHED || i.status === STATUS.ANNOUNCED
    )
  )

  const curated = computed(() =>
    blended.value.filter((i) => i.status === STATUS.CURATED).slice(0, 10)
  )

  const history = computed(() =>
    blended.value.filter((i) => i.status === STATUS.SETTLED).slice(0, 20)
  )

  return { queued, curated, history, isFeedLoading }
}
