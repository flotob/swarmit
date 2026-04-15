import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { getCuratorDeclarations } from '../chain/events.js'
import { fetchBoardIndex, resolveCuratorProfile } from '../swarm/feeds.js'
import { validate } from '../protocol/objects.js'
import { refToHex } from '../protocol/references.js'
import { useCuratorPrefsStore } from '../stores/curators.js'
import { DEFAULT_CURATORS, HIDDEN_CURATORS } from '../config.js'

const defaultRefHexes = new Set(DEFAULT_CURATORS.map((r) => refToHex(r)).filter(Boolean))

/**
 * Load all curator declarations from chain, deduplicated (latest per address).
 * Merges env-configured default curators that aren't already declared on-chain.
 */
export function useCuratorDeclarations() {
  return useQuery({
    queryKey: ['curators'],
    queryFn: async () => {
      const all = await getCuratorDeclarations()
      const byAddr = new Map()
      for (const c of all) byAddr.set(c.curator.toLowerCase(), c)
      const curators = [...byAddr.values()]
        .filter((c) => !HIDDEN_CURATORS.has(c.curator.toLowerCase()))

      const knownRefs = new Set(curators.map((c) => refToHex(c.curatorProfileRef)).filter(Boolean))
      for (const ref of DEFAULT_CURATORS) {
        const hex = refToHex(ref)
        if (hex && !knownRefs.has(hex)) {
          curators.push({ curator: `default:${hex.slice(0, 16)}`, curatorProfileRef: ref, blockNumber: '0x0' })
        }
      }

      return curators
    },
    staleTime: 30_000,
  })
}

/**
 * Check if a curator entry matches a default curator ref.
 */
function isDefaultCurator(c) {
  const hex = refToHex(c.curatorProfileRef)
  return hex && defaultRefHexes.has(hex)
}

/**
 * Case-insensitive ordered dedup for curator IDs/addresses.
 */
export function createOrderedSet() {
  const seen = new Set()
  const list = []
  function add(addr) {
    if (!addr) return
    const lower = addr.toLowerCase()
    if (!seen.has(lower)) { seen.add(lower); list.push(addr) }
  }
  return { list, add }
}

/**
 * Build an ordered candidate list for curator selection.
 * Shared by useBoard and useThread.
 */
export function buildCandidates(slug, board, curators) {
  const curatorPrefs = useCuratorPrefsStore()
  const { list, add } = createOrderedSet()

  add(curatorPrefs.getPreference(slug))
  for (const c of curators) { if (isDefaultCurator(c)) add(c.curator) }
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
export async function resolveCuratorBoardIndex(slug, board, curatorList, viewId) {
  const candidates = buildCandidates(slug, board, curatorList)

  for (const addr of candidates.list) {
    const match = curatorList.find((c) => c.curator.toLowerCase() === addr.toLowerCase())
    if (!match) continue

    try {
      const profile = await resolveCuratorProfile(match.curatorProfileRef)
      if (!profile) continue

      const boardIdx = await fetchBoardIndex(profile, slug, viewId)
      if (!boardIdx?.entries?.length) continue
      const { valid: idxValid } = validate(boardIdx)
      if (!idxValid) continue
      return { boardIndex: boardIdx, curator: { address: addr, profile }, candidates }
    } catch {
      continue
    }
  }

  return null
}

/**
 * Resolve the preferred global curator's profile.
 * Iterates candidates (user pref → env defaults → all) and returns the first
 * profile accepted by `acceptFn`. Returns null if none accepted.
 * @param {Array} curatorList - curator declarations
 * @param {(profile: Object, addr: string) => any} acceptFn - return non-null to accept
 */
export async function resolveGlobalCurator(curatorList, acceptFn) {
  const preferred = getCuratorPref('_global')
  const defaults = getDefaultCuratorIds(curatorList)
  const { list: ordered, add } = createOrderedSet()
  if (preferred) add(preferred)
  for (const d of defaults) add(d)
  for (const c of curatorList) add(c.curator)

  for (const addr of ordered) {
    const match = curatorList.find((c) => c.curator.toLowerCase() === addr.toLowerCase())
    if (!match) continue
    try {
      const profile = await resolveCuratorProfile(match.curatorProfileRef)
      const result = await acceptFn(profile, addr)
      if (result != null) return result
    } catch {
      continue
    }
  }
  return null
}

/**
 * Return curator IDs from a list that match env-configured defaults.
 */
export function getDefaultCuratorIds(curators) {
  return curators.filter(isDefaultCurator).map((c) => c.curator)
}

export function getCuratorPref(slug) {
  return useCuratorPrefsStore().getPreference(slug)
}

export function setCuratorPref(slug, address) {
  useCuratorPrefsStore().setPreference(slug, address)
}
