import { onMounted, onUnmounted } from 'vue'
import { useSubmissionsStore } from '../stores/submissions'
import { useCuratorDeclarations } from './useCurators'
import { fetchObject } from '../swarm/fetch.js'
import { fetchBoardIndex, resolveFeed } from '../swarm/feeds.js'
import { validate } from '../protocol/objects.js'

const POLL_INTERVAL = 30_000 // 30s

/**
 * Polls known curators to check if pending submissions have been picked up.
 * Posts are checked via boardIndex. Replies are checked via threadIndex.
 */
export function useSubmissionStatus() {
  const store = useSubmissionsStore()
  const { data: curators } = useCuratorDeclarations()
  let timer = null

  async function checkPending() {
    const pendingItems = store.pending
    if (!pendingItems.length || !curators.value?.length) return

    store.settleOld()

    for (const item of pendingItems) {
      try {
        if (item.kind === 'post') {
          await checkPost(item)
        } else if (item.kind === 'reply') {
          await checkReply(item)
        }
        store.markChecked(item.submissionRef)
      } catch {
        // Individual check failure is non-fatal
      }
    }
  }

  async function checkPost(item) {
    for (const c of curators.value) {
      if (item.curatorPickups.some((p) => p.curator.toLowerCase() === c.curator.toLowerCase())) continue

      try {
        const profile = await fetchObject(c.curatorProfileRef)
        const { valid } = validate(profile)
        if (!valid || !profile.boardFeeds?.[item.boardSlug]) continue

        const boardIndex = await fetchBoardIndex(profile, item.boardSlug)
        if (!boardIndex?.entries) continue

        const found = boardIndex.entries.some(
          (e) => e.submissionId === item.submissionRef || e.submissionRef === item.submissionRef
        )
        if (found) {
          store.addPickup(item.submissionRef, c.curator, profile.name || c.curator)
        }
      } catch {
        continue
      }
    }
  }

  async function checkReply(item) {
    if (!item.rootSubmissionId) return

    for (const c of curators.value) {
      if (item.curatorPickups.some((p) => p.curator.toLowerCase() === c.curator.toLowerCase())) continue

      try {
        const profile = await fetchObject(c.curatorProfileRef)
        const { valid } = validate(profile)
        if (!valid || !profile.boardFeeds?.[item.boardSlug]) continue

        const boardIndex = await fetchBoardIndex(profile, item.boardSlug)
        if (!boardIndex?.entries) continue

        // Find the root post entry to get its threadIndexFeed
        const rootEntry = boardIndex.entries.find(
          (e) => e.submissionId === item.rootSubmissionId || e.submissionRef === item.rootSubmissionId
        )
        if (!rootEntry?.threadIndexFeed) continue

        const threadIndex = await resolveFeed(rootEntry.threadIndexFeed)
        if (!threadIndex?.nodes) continue

        const found = threadIndex.nodes.some(
          (n) => n.submissionId === item.submissionRef
        )
        if (found) {
          store.addPickup(item.submissionRef, c.curator, profile.name || c.curator)
        }
      } catch {
        continue
      }
    }
  }

  onMounted(() => {
    // Initial check after a short delay
    setTimeout(checkPending, 2000)
    timer = setInterval(checkPending, POLL_INTERVAL)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return { checkPending }
}
