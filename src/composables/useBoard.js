import { useQuery } from '@tanstack/vue-query'
import { computed, ref } from 'vue'
import { getLatestBoardMetadata } from '../chain/events.js'
import { fetchObject } from '../swarm/fetch.js'
import { validate } from '../protocol/objects.js'
import { useCuratorDeclarations, resolveCuratorBoardIndex } from './useCurators.js'

function useBoardMetadata(slug) {
  return useQuery({
    queryKey: ['boardMeta', slug],
    queryFn: async () => {
      const meta = await getLatestBoardMetadata(slug.value)
      if (!meta?.boardRef) return null
      const board = await fetchObject(meta.boardRef)
      // Validate board object at the trust boundary
      const { valid } = validate(board)
      if (!valid) {
        console.warn('[useBoard] Invalid board object, ignoring')
        return null
      }
      return board
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

  // Depend on selection-relevant board metadata, not just boardId
  const boardMetaKey = computed(() => {
    const b = board.value
    if (!b) return '_none'
    return `${b.boardId}:${b.defaultCurator || ''}:${(b.endorsedCurators || []).join(',')}`
  })

  const boardQuery = useQuery({
    queryKey: ['boardIndex', slugRef, boardMetaKey],
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

      // Validate boardIndex at the trust boundary
      const { valid } = validate(boardIndex)
      if (!valid) {
        console.warn('[useBoard] Invalid boardIndex, ignoring')
        return null
      }

      // Bulk-fetch submissions + content, drop malformed entries individually
      const entries = (await Promise.all(
        boardIndex.entries.map(async (entry) => {
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
