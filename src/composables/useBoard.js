import { useQuery } from '@tanstack/vue-query'
import { computed, ref } from 'vue'
import { getLatestBoardMetadata } from '../chain/events.js'
import { fetchObject } from '../swarm/fetch.js'
import { fetchBoardIndex } from '../swarm/feeds.js'
import { useCuratorDeclarations, buildCandidates } from './useCurators.js'

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

  const boardIndexQuery = useQuery({
    queryKey: ['boardIndex', slugRef],
    queryFn: async () => {
      const slug = slugRef.value
      const boardObj = board.value
      const curatorList = curators.value || []

      if (!curatorList.length) return null

      const candidates = buildCandidates(slug, boardObj, curatorList)

      for (const addr of candidates.list) {
        const match = curatorList.find((c) => c.curator.toLowerCase() === addr.toLowerCase())
        if (!match) continue

        try {
          const profile = await fetchObject(match.curatorProfileRef)
          if (!profile) continue

          const boardIndex = await fetchBoardIndex(profile, slug)
          if (boardIndex?.entries?.length) {
            selectedCurator.value = { address: addr, profile }
            showCuratorBanner.value = candidates.needsPrompt || (candidates.preferred && candidates.preferred.toLowerCase() !== addr.toLowerCase())
            return boardIndex
          }
        } catch {
          continue
        }
      }

      return null
    },
    enabled: computed(() => !!slugRef.value && !!curators.value?.length),
    staleTime: 30_000,
  })

  return {
    board,
    curators,
    boardIndex: boardIndexQuery.data,
    isLoading: boardIndexQuery.isLoading,
    isError: boardIndexQuery.isError,
    error: boardIndexQuery.error,
    selectedCurator,
    showCuratorBanner,
  }
}
