import { useQuery, keepPreviousData } from '@tanstack/vue-query'
import { computed } from 'vue'
import { getLatestBoardMetadata } from '../chain/events.js'
import { fetchObject, resolveEntries } from '../swarm/fetch.js'
import { validate } from '../protocol/objects.js'
import { useCuratorDeclarations, resolveCuratorBoardIndex, getCuratorPref } from './useCurators.js'
import { useViewsStore } from '../stores/views.js'

export function useBoardMetadata(slug) {
  return useQuery({
    queryKey: ['boardMeta', slug],
    queryFn: async () => {
      const meta = await getLatestBoardMetadata(slug.value)
      if (!meta?.boardRef) return null
      const board = await fetchObject(meta.boardRef)
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
  const viewsStore = useViewsStore()

  const boardMetaKey = computed(() => {
    const b = board.value
    if (!b) return '_none'
    return `${b.boardId}:${b.defaultCurator || ''}:${(b.endorsedCurators || []).join(',')}`
  })

  const curatorPrefKey = computed(() => getCuratorPref(slugRef.value) || '_auto')
  const viewId = computed(() => viewsStore.getView(`board:${slugRef.value}`))

  const boardQuery = useQuery({
    queryKey: ['boardIndex', slugRef, boardMetaKey, curatorPrefKey, viewId],
    queryFn: async () => {
      const slug = slugRef.value
      const boardObj = board.value
      const curatorList = curators.value || []

      if (!curatorList.length) return null

      const result = await resolveCuratorBoardIndex(slug, boardObj, curatorList, viewId.value)
      if (!result) return null

      const { boardIndex, curator } = result

      const { valid } = validate(boardIndex)
      if (!valid) {
        console.warn('[useBoard] Invalid boardIndex, ignoring')
        return null
      }

      const entries = await resolveEntries(boardIndex.entries)

      return { ...boardIndex, entries, curatorAddress: curator.address, curatorProfile: curator.profile }
    },
    enabled: computed(() => !!slugRef.value && !!curators.value?.length),
    placeholderData: keepPreviousData,
    staleTime: 5_000,
    refetchInterval: 5_000,
  })

  const curatorAddress = computed(() => boardQuery.data.value?.curatorAddress ?? null)
  const curatorProfile = computed(() => boardQuery.data.value?.curatorProfile ?? null)

  return {
    board,
    curators,
    boardIndex: boardQuery.data,
    isLoading: boardQuery.isLoading,
    isError: boardQuery.isError,
    error: boardQuery.error,
    curatorAddress,
    curatorProfile,
  }
}
