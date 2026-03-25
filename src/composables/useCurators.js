import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { getCuratorDeclarations } from '../chain/events.js'
import { fetchObject } from '../swarm/fetch.js'
import { fetchBoardIndex } from '../swarm/feeds.js'
import { validate } from '../protocol/objects.js'
import { getCuratorPref, setCuratorPref } from '../state.js'

/**
 * Load all curator declarations from chain, deduplicated (latest per address).
 */
export function useCuratorDeclarations() {
  return useQuery({
    queryKey: ['curators'],
    queryFn: async () => {
      const all = await getCuratorDeclarations()
      const byAddr = new Map()
      for (const c of all) byAddr.set(c.curator.toLowerCase(), c)
      return [...byAddr.values()]
    },
    staleTime: 30_000, // 30s — curators update profiles when new boards appear
  })
}

/**
 * Build an ordered candidate list for curator selection.
 * Shared by useBoard and useThread.
 */
export function buildCandidates(slug, board, curators) {
  const seen = new Set()
  const list = []

  function add(addr) {
    if (!addr) return
    const lower = addr.toLowerCase()
    if (seen.has(lower)) return
    seen.add(lower)
    list.push(addr)
  }

  add(getCuratorPref(slug))
  add(board?.defaultCurator)
  if (board?.endorsedCurators?.length === 1) add(board.endorsedCurators[0])

  const preferred = list.length > 0 ? list[0] : null
  const needsPrompt = list.length === 0 && curators.length > 1

  for (const c of curators) add(c.curator)

  return { list, needsPrompt, preferred }
}

/**
 * Shared curator resolution loop — try candidates until one has a usable boardIndex.
 */
export async function resolveCuratorBoardIndex(slug, board, curatorList) {
  const candidates = buildCandidates(slug, board, curatorList)

  for (const addr of candidates.list) {
    const match = curatorList.find((c) => c.curator.toLowerCase() === addr.toLowerCase())
    if (!match) continue

    try {
      const profile = await fetchObject(match.curatorProfileRef)
      if (!profile) continue
      const { valid: profileValid } = validate(profile)
      if (!profileValid) continue

      const boardIdx = await fetchBoardIndex(profile, slug)
      if (boardIdx?.entries?.length) {
        return { boardIndex: boardIdx, curator: { address: addr, profile }, candidates }
      }
    } catch {
      continue
    }
  }

  return null
}

export { setCuratorPref }
