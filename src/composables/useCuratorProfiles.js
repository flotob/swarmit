import { reactive, watch } from 'vue'
import { fetchObject } from '../swarm/fetch.js'
import { validate } from '../protocol/objects.js'
import { truncateAddress } from '../lib/format.js'

/**
 * Fetch and cache curator profiles for a list of curator declarations.
 * Profiles are immutable Swarm objects — fetchObject caches them after first load.
 * @param {Ref|Function} curatorsRef — reactive source of curator declarations
 * @returns {{ profiles: Map, profileName: (addr) => string }}
 */
export function useCuratorProfiles(curatorsRef) {
  const profiles = reactive(new Map())

  const source = typeof curatorsRef === 'function' ? curatorsRef : () => curatorsRef.value

  watch(source, async (list) => {
    if (!list) return
    await Promise.allSettled(
      list
        .filter((c) => c.curator && !profiles.has(c.curator))
        .map(async (c) => {
          try {
            const profile = await fetchObject(c.curatorProfileRef)
            const { valid } = validate(profile)
            profiles.set(c.curator, valid ? profile : null)
          } catch {
            profiles.set(c.curator, null)
          }
        })
    )
  }, { immediate: true })

  function profileName(addr) {
    return profiles.get(addr)?.name || truncateAddress(addr)
  }

  return { profiles, profileName }
}
