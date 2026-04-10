/**
 * Display-name resolution for addresses.
 *
 * Precedence:
 *   1. Explicit contextual name (e.g. curatorProfile.name)
 *   2. On-chain primary username from SwarmitUsernameRegistry
 *   3. Deterministic fallback name from swarmit-protocol
 *   4. Truncated address as a last-resort catch
 *
 * `displayName()` is synchronous and safe to call from templates. The
 * on-chain lookup is handled by useUsernamesStore via request-on-access
 * batching — uncached addresses return the fallback immediately and
 * upgrade to the on-chain name on the next render tick.
 */

import { addressToFallbackName } from 'swarmit-protocol'
import { useUsernamesStore } from '../stores/usernames.js'
import { truncateAddress } from './format.js'

export function displayName(address, explicitName) {
  if (explicitName) return explicitName
  if (!address) return truncateAddress(address)

  const onChain = useUsernamesStore().getName(address)
  if (onChain) return onChain

  try { return addressToFallbackName(address) }
  catch { return truncateAddress(address) }
}
