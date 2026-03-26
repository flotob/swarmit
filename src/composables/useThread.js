import { useQuery } from '@tanstack/vue-query'
import { computed, ref } from 'vue'
import { getLatestBoardMetadata } from '../chain/events.js'
import { fetchObject, resolveEntries } from '../swarm/fetch.js'
import { resolveFeed } from '../swarm/feeds.js'
import { hexToBzz } from '../protocol/references.js'
import { validate } from '../protocol/objects.js'
import { useCuratorDeclarations, resolveCuratorBoardIndex } from './useCurators.js'

export function useThread(slugRef, rootSubIdRef) {
  const { data: curators } = useCuratorDeclarations()

  const selectedCurator = ref(null)
  const showCuratorBanner = ref(false)

  const rootSubRef = computed(() => {
    const id = rootSubIdRef.value
    return id ? hexToBzz(id) : null
  })

  const threadQuery = useQuery({
    queryKey: ['thread', slugRef, rootSubIdRef],
    queryFn: async () => {
      const slug = slugRef.value
      const rootRef = rootSubRef.value
      const curatorList = curators.value || []

      if (!rootRef || !curatorList.length) return null

      // Load board metadata for curator selection (defaultCurator, endorsedCurators)
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

      const { boardIndex, curator, candidates } = resolved

      const rootEntry = boardIndex.entries.find(
        (e) => e.submissionId === rootRef || e.submissionRef === rootRef
      )
      if (!rootEntry?.threadIndexFeed) return null

      const threadIndex = await resolveFeed(rootEntry.threadIndexFeed)
      if (!threadIndex?.nodes?.length) return null

      // Validate threadIndex at the trust boundary
      const { valid } = validate(threadIndex)
      if (!valid) {
        console.warn('[useThread] Invalid threadIndex, ignoring')
        return null
      }

      const nodes = await resolveEntries(threadIndex.nodes, { refKey: 'submissionId' })

      selectedCurator.value = curator
      showCuratorBanner.value = candidates.needsPrompt || (candidates.preferred && candidates.preferred.toLowerCase() !== curator.address.toLowerCase())

      return { threadIndex, nodes, rootRef }
    },
    enabled: computed(() => !!slugRef.value && !!rootSubIdRef.value && !!curators.value?.length),
    staleTime: 30_000,
  })

  return {
    thread: threadQuery.data,
    isLoading: threadQuery.isLoading,
    isError: threadQuery.isError,
    error: threadQuery.error,
    rootSubRef,
    selectedCurator,
    showCuratorBanner,
  }
}
