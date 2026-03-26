import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'swarmit-submissions'
const SETTLED_TTL = 1000 * 60 * 60 * 24 // 24h — stop polling after this

/**
 * Submission lifecycle states:
 * - publishing: Swarm objects being uploaded
 * - announced: chain tx sent (not necessarily confirmed)
 * - waiting: announced, no curator pickup detected yet
 * - curated: at least one curator has included it
 * - settled: curated and older than TTL (no more polling)
 */

export const useSubmissionsStore = defineStore('submissions', () => {
  const items = ref(loadFromStorage())

  function loadFromStorage() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch { return [] }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value))
  }

  /**
   * Add a new submission after publish completes.
   */
  function add(entry) {
    items.value.unshift({
      submissionRef: entry.submissionRef,
      contentRef: entry.contentRef,
      boardSlug: entry.boardSlug,
      kind: entry.kind,               // 'post' or 'reply'
      title: entry.title || null,      // post title, null for replies
      bodyPreview: entry.bodyPreview || null,
      rootSubmissionId: entry.rootSubmissionId || null,
      parentSubmissionId: entry.parentSubmissionId || null,
      txHash: entry.txHash || null,
      announced: entry.announced || false,
      createdAt: Date.now(),
      lastCheckedAt: null,
      curatorPickups: [],              // [{ curator, curatorName, pickedUpAt }]
      status: entry.announced ? 'waiting' : 'announced',
    })
    persist()
  }

  /**
   * Record a curator pickup for a submission.
   */
  function addPickup(submissionRef, curator, curatorName) {
    const item = items.value.find((i) => i.submissionRef === submissionRef)
    if (!item) return
    if (item.curatorPickups.some((p) => p.curator.toLowerCase() === curator.toLowerCase())) return
    item.curatorPickups.push({ curator, curatorName, pickedUpAt: Date.now() })
    item.status = 'curated'
    persist()
  }

  /**
   * Mark a submission as checked (updates lastCheckedAt).
   */
  function markChecked(submissionRef) {
    const item = items.value.find((i) => i.submissionRef === submissionRef)
    if (!item) return
    item.lastCheckedAt = Date.now()
    persist()
  }

  /**
   * Settle old curated items (stop polling).
   */
  function settleOld() {
    let changed = false
    for (const item of items.value) {
      if (item.status === 'curated' && item.createdAt < Date.now() - SETTLED_TTL) {
        item.status = 'settled'
        changed = true
      }
    }
    if (changed) persist()
  }

  /**
   * Get submissions that need polling (not settled, recent).
   */
  const pending = computed(() =>
    items.value.filter((i) => i.status === 'waiting' || i.status === 'announced')
  )

  const recent = computed(() =>
    items.value.filter((i) => i.status !== 'settled').slice(0, 20)
  )

  const all = computed(() => items.value)

  /**
   * Get pending submissions for a specific thread (by rootSubmissionId).
   */
  function pendingForThread(rootSubmissionId) {
    return items.value.filter((i) =>
      (i.status === 'waiting' || i.status === 'announced' || i.status === 'curated') &&
      i.rootSubmissionId === rootSubmissionId &&
      i.kind === 'reply'
    )
  }

  /**
   * Get pending posts for a board.
   */
  function pendingForBoard(boardSlug) {
    return items.value.filter((i) =>
      (i.status === 'waiting' || i.status === 'announced') &&
      i.boardSlug === boardSlug &&
      i.kind === 'post'
    )
  }

  return { items, add, addPickup, markChecked, settleOld, pending, recent, all, pendingForThread, pendingForBoard, persist }
})
