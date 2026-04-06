import { reactive, watch, onScopeDispose } from 'vue'
import { resolveCuratorProfile } from '../swarm/feeds.js'
import { truncateAddress } from '../lib/format.js'

const REFRESH_INTERVAL_MS = 30_000

/**
 * Fetch and periodically refresh curator profiles for a list of declarations.
 *
 * Profiles are resolved via resolveCuratorProfile() which uses a 30s TTL cache.
 * The watcher handles new curators appearing; the interval handles refreshing
 * existing curators so feed-backed profiles stay fresh.
 *
 * @param {Ref|Function} curatorsRef — reactive source of curator declarations
 * @returns {{ profiles: Map, profileName: (addr) => string }}
 */
export function useCuratorProfiles(curatorsRef) {
  const profiles = reactive(new Map())
  const source = typeof curatorsRef === 'function' ? curatorsRef : () => curatorsRef.value
  let resolving = false

  async function resolveAll(list) {
    if (!list?.length || resolving) return
    resolving = true
    try { await Promise.allSettled(
      list.map(async (c) => {
        try {
          const profile = await resolveCuratorProfile(c.curatorProfileRef)
          profiles.set(c.curator, profile)
        } catch {
          if (!profiles.has(c.curator)) profiles.set(c.curator, null)
        }
      })
    ) } finally { resolving = false }
  }

  // Resolve immediately when the curator list changes (picks up new curators).
  watch(source, (list) => resolveAll(list), { immediate: true })

  // Periodic refresh of ALL known profiles (aligned with the resolver's 30s TTL).
  const refreshTimer = setInterval(() => {
    const list = source()
    if (list?.length) resolveAll(list)
  }, REFRESH_INTERVAL_MS)

  onScopeDispose(() => clearInterval(refreshTimer))

  function profileName(addr) {
    return profiles.get(addr)?.name || truncateAddress(addr)
  }

  return { profiles, profileName }
}
