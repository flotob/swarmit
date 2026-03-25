import { useQuery } from '@tanstack/vue-query'
import { computed, ref } from 'vue'
import { getLatestBoardMetadata } from '../chain/events.js'
import { fetchObject } from '../swarm/fetch.js'
import { useCuratorDeclarations, resolveCuratorBoardIndex } from './useCurators.js'

function useBoardMetadata(slug) {
  return useQuery({
    queryKey: ['boardMeta', slug],
    queryFn: async () => {
      const meta = await getLatestBoardMetadata(slug.value)
      if (!meta?.boardRef) return null
      return fetchObject(meta.boardRef)
    },
    enabled: computed(() => !!slug.value),
    staleTime: 60_000,
  })
}

export function useBoard(slugRef) {
  const { data: board } = useBoardMetadata(slugRef)
  const { data: curators } = useCuratorDeclarations()

  const selectedCurator = ref(null)
  const showCuratorBanner = ref(false)

  const boardQuery = useQuery({
    queryKey: ['boardIndex', slugRef],
    queryFn: async () => {
      const slug = slugRef.value
      const boardObj = board.value
      const curatorList = curators.value || []

      if (!curatorList.length) return null

      const result = await resolveCuratorBoardIndex(slug, boardObj, curatorList)
      if (!result) return null

      const { boardIndex, curator, candidates } = result
      selectedCurator.value = curator
      showCuratorBanner.value = candidates.needsPrompt || (candidates.preferred && candidates.preferred.toLowerCase() !== curator.address.toLowerCase())

      // Bulk-fetch submissions + content for all entries in parallel
      const entries = await Promise.all(
        boardIndex.entries.map(async (entry) => {
          try {
            const submission = await fetchObject(entry.submissionRef)
            const content = submission?.contentRef ? await fetchObject(submission.contentRef) : null
            return { ...entry, submission, content }
          } catch {
            return { ...entry, submission: null, content: null }
          }
        })
      )

      return { ...boardIndex, entries }
    },
    enabled: computed(() => !!slugRef.value && !!curators.value?.length),
    staleTime: 30_000,
  })

  return {
    board,
    curators,
    boardIndex: boardQuery.data,
    isLoading: boardQuery.isLoading,
    isError: boardQuery.isError,
    error: boardQuery.error,
    selectedCurator,
    showCuratorBanner,
  }
}
