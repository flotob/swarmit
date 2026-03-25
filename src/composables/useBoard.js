import { useQuery } from '@tanstack/vue-query'
import { computed, ref, watch } from 'vue'
import { getLatestBoardMetadata } from '../chain/events.js'
import { fetchObject } from '../swarm/fetch.js'
import { fetchBoardIndex } from '../swarm/feeds.js'
import { useCuratorDeclarations, selectCurator, needsCuratorPrompt } from './useCurators.js'

/**
 * Load board metadata from chain.
 */
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

/**
 * Full board composable — metadata + curator selection + boardIndex with fallthrough.
 */
export function useBoard(slugRef) {
  const { data: board } = useBoardMetadata(slugRef)
  const { data: curators } = useCuratorDeclarations()

  const selectedCurator = ref(null)
  const showCuratorBanner = ref(false)

  // Resolve curator + boardIndex
  const boardIndexQuery = useQuery({
    queryKey: ['boardIndex', slugRef, curators],
    queryFn: async () => {
      const slug = slugRef.value
      const boardObj = board.value
      const curatorList = curators.value || []

      if (!curatorList.length) return null

      // Build candidate list
      const candidates = buildCandidates(slug, boardObj, curatorList)
      const preferred = candidates.preferred

      // Try each candidate until one has usable data
      for (const addr of candidates.list) {
        const match = curatorList.find((c) => c.curator.toLowerCase() === addr.toLowerCase())
        if (!match) continue

        try {
          const profile = await fetchObject(match.curatorProfileRef)
          if (!profile) continue

          const boardIndex = await fetchBoardIndex(profile, slug)
          if (boardIndex?.entries?.length) {
            selectedCurator.value = { address: addr, profile }
            showCuratorBanner.value = candidates.needsPrompt || (preferred && preferred.toLowerCase() !== addr.toLowerCase())
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

function buildCandidates(slug, board, curators) {
  const seen = new Set()
  const list = []
  let needsPrompt = false

  function add(addr) {
    if (!addr) return
    const lower = addr.toLowerCase()
    if (seen.has(lower)) return
    seen.add(lower)
    list.push(addr)
  }

  // Import getCuratorPref directly to avoid circular composable deps
  let pref = null
  try {
    const stored = JSON.parse(localStorage.getItem('swarmit-curator-prefs') || '{}')
    pref = stored[slug] || null
  } catch {}

  add(pref)
  add(board?.defaultCurator)
  if (board?.endorsedCurators?.length === 1) add(board.endorsedCurators[0])

  const preferred = list.length > 0 ? list[0] : null
  needsPrompt = list.length === 0 && curators.length > 1

  for (const c of curators) add(c.curator)

  return { list, needsPrompt, preferred }
}
