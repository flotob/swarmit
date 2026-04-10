/**
 * Vote totals + user-vote cache with request-on-access batching.
 *
 * Components call getTotals(ref) / getMyVote(ref) during render — cached
 * values return immediately, uncached refs enqueue for the next microtask
 * batch and return null (template treats null as zero).
 *
 * One flush batches all pending refs into a single Multicall3 call via
 * getVotesBatch, populating the reactive maps so Vue re-renders the
 * dependent templates with fresh values.
 *
 * The voter for myVote reads is always auth.userAddress — the store
 * reads it internally. A wallet change clears all myVote entries so we
 * never serve stale directions from the previous wallet.
 *
 * Caches both positive and zero results with a 30s TTL. Components
 * manage their own optimistic overrides on top of store reads.
 */

import { defineStore } from 'pinia'
import { reactive, watch } from 'vue'
import { getVotesBatch } from '../chain/votes.js'
import { isContractConfigured } from '../chain/contract.js'
import { useAuthStore } from './auth.js'

const TTL_MS = 30 * 1000

export const useVotesStore = defineStore('votes', () => {
  const totals = reactive({})
  const myVotes = reactive({})
  const pendingTotals = new Set()
  const pendingMyVotes = new Set()
  let flushScheduled = false

  const auth = useAuthStore()
  watch(() => auth.userAddress, () => {
    for (const key of Object.keys(myVotes)) delete myVotes[key]
    pendingMyVotes.clear()
  })

  function getTotals(ref) {
    if (!ref || !isContractConfigured()) return null
    const key = ref.toLowerCase()
    const entry = totals[key]
    if (entry && (Date.now() - entry.fetchedAt) < TTL_MS) {
      return { upvotes: entry.upvotes, downvotes: entry.downvotes }
    }
    if (!pendingTotals.has(key)) {
      pendingTotals.add(key)
      scheduleFlush()
    }
    return null
  }

  function getMyVote(ref) {
    if (!ref || !auth.userAddress || !isContractConfigured()) return null
    const key = ref.toLowerCase()
    const entry = myVotes[key]
    if (entry && (Date.now() - entry.fetchedAt) < TTL_MS) {
      return entry.direction
    }
    if (!pendingMyVotes.has(key)) {
      pendingMyVotes.add(key)
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
    if (!pendingTotals.size && !pendingMyVotes.size) return

    const totalsBatch = [...pendingTotals]
    const myVotesBatch = [...pendingMyVotes]
    pendingTotals.clear()
    pendingMyVotes.clear()

    const refsNeeded = new Set([...totalsBatch, ...myVotesBatch])
    const voter = auth.userAddress

    try {
      const result = await getVotesBatch([...refsNeeded], voter)
      const now = Date.now()
      for (const [key, { upvotes, downvotes }] of result.totals) {
        totals[key] = { upvotes, downvotes, fetchedAt: now }
      }
      if (voter) {
        for (const [key, direction] of result.myVotes) {
          myVotes[key] = { direction, fetchedAt: now }
        }
      }
    } catch (err) {
      console.debug('[votes] batch flush failed', err)
    }
  }

  function invalidate(ref) {
    if (!ref) return
    const key = ref.toLowerCase()
    delete totals[key]
    delete myVotes[key]
  }

  return { getTotals, getMyVote, invalidate }
})
