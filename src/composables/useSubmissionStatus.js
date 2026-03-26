import { onMounted, onUnmounted } from 'vue'
import { useSubmissionsStore } from '../stores/submissions'
import { useCuratorDeclarations } from './useCurators'
import { fetchObject } from '../swarm/fetch.js'
import { fetchBoardIndex, resolveFeed } from '../swarm/feeds.js'
import { validate } from '../protocol/objects.js'

const POLL_INTERVAL = 30_000

/**
 * Polls known curators to check if pending submissions have been picked up.
 * Posts checked via boardIndex, replies via threadIndex.
 */
export function useSubmissionStatus() {
  const store = useSubmissionsStore()
  const { data: curators } = useCuratorDeclarations()
  let timer = null
  let initialTimeout = null
  let checking = false

  async function checkPending() {
    if (checking) return
    const pendingItems = store.pending
    if (!pendingItems.length || !curators.value?.length) return

    checking = true
    let changed = false

    try {
      store.settleOld()

      // Per-cycle memoization: cache (curatorAddress, boardSlug) → boardIndex
      const boardIndexCache = new Map()

      async function getCachedBoardIndex(curator, boardSlug) {
        const key = `${curator.curator}:${boardSlug}`
        if (boardIndexCache.has(key)) return boardIndexCache.get(key)

        try {
          const profile = await fetchObject(curator.curatorProfileRef)
          const { valid } = validate(profile)
          if (!valid || !profile.boardFeeds?.[boardSlug]) {
            boardIndexCache.set(key, null)
            return null
          }
          const boardIndex = await fetchBoardIndex(profile, boardSlug)
          const { valid: idxValid } = validate(boardIndex || {})
          if (!idxValid) {
            boardIndexCache.set(key, null)
            return null
          }
          boardIndexCache.set(key, { boardIndex, profile })
          return { boardIndex, profile }
        } catch {
          boardIndexCache.set(key, null)
          return null
        }
      }

      for (const item of pendingItems) {
        try {
          if (item.kind === 'post') {
            changed = await checkPost(item, getCachedBoardIndex) || changed
          } else if (item.kind === 'reply') {
            changed = await checkReply(item, getCachedBoardIndex) || changed
          }
          store.markChecked(item.submissionRef)
        } catch {
          // Individual check failure is non-fatal
        }
      }

      // Batch persist once at the end
      if (changed) store.persist()
    } finally {
      checking = false
    }
  }

  async function checkPost(item, getCachedBoardIndex) {
    let changed = false
    for (const c of curators.value) {
      if (item.curatorPickups.some((p) => p.curator.toLowerCase() === c.curator.toLowerCase())) continue

      const result = await getCachedBoardIndex(c, item.boardSlug)
      if (!result?.boardIndex?.entries) continue

      const found = result.boardIndex.entries.some(
        (e) => e.submissionId === item.submissionRef || e.submissionRef === item.submissionRef
      )
      if (found) {
        changed = store.addPickup(item.submissionRef, c.curator, result.profile.name || c.curator) || changed
      }
    }
    return changed
  }

  async function checkReply(item, getCachedBoardIndex) {
    if (!item.rootSubmissionId) return false
    let changed = false

    for (const c of curators.value) {
      if (item.curatorPickups.some((p) => p.curator.toLowerCase() === c.curator.toLowerCase())) continue

      const result = await getCachedBoardIndex(c, item.boardSlug)
      if (!result?.boardIndex?.entries) continue

      const rootEntry = result.boardIndex.entries.find(
        (e) => e.submissionId === item.rootSubmissionId || e.submissionRef === item.rootSubmissionId
      )
      if (!rootEntry?.threadIndexFeed) continue

      try {
        const threadIndex = await resolveFeed(rootEntry.threadIndexFeed)
        if (!threadIndex?.nodes) continue
        const { valid: threadValid } = validate(threadIndex)
        if (!threadValid) continue

        const found = threadIndex.nodes.some((n) => n.submissionId === item.submissionRef)
        if (found) {
          changed = store.addPickup(item.submissionRef, c.curator, result.profile.name || c.curator) || changed
        }
      } catch {
        continue
      }
    }
    return changed
  }

  onMounted(() => {
    initialTimeout = setTimeout(checkPending, 2000)
    timer = setInterval(checkPending, POLL_INTERVAL)
  })

  onUnmounted(() => {
    if (initialTimeout) clearTimeout(initialTimeout)
    if (timer) clearInterval(timer)
  })

  return { checkPending }
}
