import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { getLatestBoardMetadata } from '../chain/events.js'
import { fetchObject, resolveEntries } from '../swarm/fetch.js'
import { resolveFeed } from '../swarm/feeds.js'
import { hexToBzz } from '../protocol/references.js'
import { validate } from '../protocol/objects.js'
import { useCuratorDeclarations, resolveCuratorBoardIndex, getCuratorPref } from './useCurators.js'

export function useThread(slugRef, rootSubIdRef) {
  const { data: curators } = useCuratorDeclarations()

  const rootSubRef = computed(() => {
    const id = rootSubIdRef.value
    return id ? hexToBzz(id) : null
  })

  const curatorPrefKey = computed(() => getCuratorPref(slugRef.value) || '_auto')

  const threadQuery = useQuery({
    queryKey: ['thread', slugRef, rootSubIdRef, curatorPrefKey],
    queryFn: async () => {
      const slug = slugRef.value
      const rootRef = rootSubRef.value
      const curatorList = curators.value || []

      if (!rootRef || !curatorList.length) return null

      let board = null
      try {
        const meta = await getLatestBoardMetadata(slug)
        if (meta?.boardRef) {
          board = await fetchObject(meta.boardRef)
          const { valid } = validate(board)
          if (!valid) board = null
        }
      } catch { /* continue without board metadata */ }

      const resolved = await resolveCuratorBoardIndex(slug, board, curatorList)
      if (!resolved) return null

      const { boardIndex, curator } = resolved

      const rootEntry = boardIndex.entries.find(
        (e) => e.submissionId === rootRef || e.submissionRef === rootRef
      )
      if (!rootEntry?.threadIndexFeed) return null

      const threadIndex = await resolveFeed(rootEntry.threadIndexFeed)
      if (!threadIndex?.nodes?.length) return null

      const { valid } = validate(threadIndex)
      if (!valid) {
        console.warn('[useThread] Invalid threadIndex, ignoring')
        return null
      }

      const nodes = await resolveEntries(threadIndex.nodes, { refKey: 'submissionId' })

      return { threadIndex, nodes, rootRef, curatorAddress: curator.address, curatorProfile: curator.profile }
    },
    enabled: computed(() => !!slugRef.value && !!rootSubIdRef.value && !!curators.value?.length),
    staleTime: 30_000,
  })

  const selectedCurator = computed(() => {
    const data = threadQuery.data.value
    if (!data) return null
    return { address: data.curatorAddress, profile: data.curatorProfile }
  })

  return {
    thread: threadQuery.data,
    isLoading: threadQuery.isLoading,
    isError: threadQuery.isError,
    error: threadQuery.error,
    rootSubRef,
    selectedCurator,
  }
}
