import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { getCuratorDeclarations } from '../chain/events.js'
import { fetchObject } from '../swarm/fetch.js'
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
    staleTime: 5 * 60_000,
  })
}

/**
 * Fetch a curator's profile by address.
 */
export function useCuratorProfile(curatorAddress, curators) {
  return useQuery({
    queryKey: ['curatorProfile', curatorAddress],
    queryFn: async () => {
      const match = curators.value?.find(
        (c) => c.curator.toLowerCase() === curatorAddress.value?.toLowerCase()
      )
      if (!match) return null
      return fetchObject(match.curatorProfileRef)
    },
    enabled: computed(() => !!curatorAddress.value && !!curators.value?.length),
    staleTime: 5 * 60_000,
  })
}

/**
 * Select the best curator for a board.
 * Order: user pref > board.defaultCurator > single endorsed > first declared.
 */
export function selectCurator(slug, board, curators) {
  const pref = getCuratorPref(slug)
  if (pref) return pref

  if (board?.defaultCurator) return board.defaultCurator
  if (board?.endorsedCurators?.length === 1) return board.endorsedCurators[0]

  if (curators?.length > 0) return curators[0].curator
  return null
}

/**
 * Whether the user needs to be prompted to choose a curator.
 */
export function needsCuratorPrompt(slug, board, curators) {
  const pref = getCuratorPref(slug)
  if (pref) return false
  if (board?.defaultCurator) return false
  if (board?.endorsedCurators?.length === 1) return false
  return curators?.length > 1
}

export { setCuratorPref }
