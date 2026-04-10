/**
 * On-chain username cache with request-on-access batching.
 *
 * Components call `getName(address)` during render — the function returns
 * the cached value synchronously if present, otherwise enqueues the address
 * for the next microtask batch and returns null. The batch flush calls
 * getPrimaryNames() via Multicall3, writes results into the reactive map,
 * and Vue re-renders the dependent templates.
 *
 * Caches both positive (name string) and negative (empty string) results
 * with a 5-minute TTL.
 */

import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { getPrimaryNames, isUsernameRegistryConfigured } from '../chain/username-registry.js'

const TTL_MS = 5 * 60 * 1000

export const useUsernamesStore = defineStore('usernames', () => {
  const names = reactive({})
  const pending = new Set()
  let flushScheduled = false

  function getName(address) {
    if (!address || !isUsernameRegistryConfigured()) return null
    const key = address.toLowerCase()
    const entry = names[key]
    if (entry && (Date.now() - entry.fetchedAt) < TTL_MS) {
      return entry.name || null
    }
    if (!pending.has(key)) {
      pending.add(key)
      scheduleFlush()
    }
    return null
  }

  function scheduleFlush() {
    if (flushScheduled) return
    flushScheduled = true
    queueMicrotask(flush)
  }

  async function flush() {
    flushScheduled = false
    if (!pending.size) return
    const batch = [...pending]
    pending.clear()
    try {
      const results = await getPrimaryNames(batch)
      const now = Date.now()
      for (const addr of batch) {
        names[addr] = { name: results.get(addr) || '', fetchedAt: now }
      }
    } catch (err) {
      // Leave entries unset so the next access retries.
      console.debug('[usernames] batch flush failed', err)
    }
  }

  function invalidate(address) {
    if (!address) return
    delete names[address.toLowerCase()]
  }

  return { getName, invalidate }
})
