import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { STATUS } from '../lib/submission-status.js'

const STORAGE_KEY = 'swarmit-submissions'
const SETTLED_TTL = 1000 * 60 * 60 * 24     // 24h — stop polling
const PRUNE_AGE = 1000 * 60 * 60 * 24 * 7   // 7d — remove old settled items

export const useSubmissionsStore = defineStore('submissions', () => {
  const items = ref(loadFromStorage())

  function loadFromStorage() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      return data.filter((i) => !(i.status === STATUS.SETTLED && i.createdAt < Date.now() - PRUNE_AGE))
    } catch { return [] }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value))
  }

  function add(entry) {
    items.value.unshift({
      submissionRef: entry.submissionRef,
      contentRef: entry.contentRef,
      boardSlug: entry.boardSlug,
      kind: entry.kind,
      title: entry.title || null,
      bodyPreview: entry.bodyPreview || null,
      rootSubmissionId: entry.rootSubmissionId || null,
      parentSubmissionId: entry.parentSubmissionId || null,
      txHash: entry.txHash || null,
      announced: entry.announced || false,
      createdAt: Date.now(),
      lastCheckedAt: null,
      curatorPickups: [],
      status: entry.announced ? STATUS.WAITING : STATUS.ANNOUNCED,
    })
    persist()
  }

  // Returns true if changed — caller batches persist
  function addPickup(submissionRef, curator, curatorName) {
    const item = items.value.find((i) => i.submissionRef === submissionRef)
    if (!item) return false
    if (item.curatorPickups.some((p) => p.curator.toLowerCase() === curator.toLowerCase())) return false
    item.curatorPickups.push({ curator, curatorName, pickedUpAt: Date.now() })
    item.status = STATUS.CURATED
    return true
  }

  // No persist — caller batches
  function markChecked(submissionRef) {
    const item = items.value.find((i) => i.submissionRef === submissionRef)
    if (item) item.lastCheckedAt = Date.now()
  }

  function settleOld() {
    let changed = false
    const now = Date.now()
    for (const item of items.value) {
      if (item.status === STATUS.CURATED && item.createdAt < now - SETTLED_TTL) {
        item.status = STATUS.SETTLED
        changed = true
      }
    }
    const before = items.value.length
    items.value = items.value.filter((i) => !(i.status === STATUS.SETTLED && i.createdAt < now - PRUNE_AGE))
    if (items.value.length !== before) changed = true
    if (changed) persist()
  }

  const pending = computed(() =>
    items.value.filter((i) => i.status === STATUS.WAITING || i.status === STATUS.ANNOUNCED)
  )

  const recent = computed(() =>
    items.value.filter((i) => i.status !== STATUS.SETTLED).slice(0, 20)
  )

  function pendingForThread(rootSubmissionId) {
    return items.value.filter((i) =>
      (i.status === STATUS.WAITING || i.status === STATUS.ANNOUNCED || i.status === STATUS.CURATED) &&
      i.rootSubmissionId === rootSubmissionId &&
      i.kind === 'reply'
    )
  }

  function pendingForBoard(boardSlug) {
    return items.value.filter((i) =>
      (i.status === STATUS.WAITING || i.status === STATUS.ANNOUNCED) &&
      i.boardSlug === boardSlug &&
      i.kind === 'post'
    )
  }

  return { items, add, addPickup, markChecked, settleOld, persist, pending, recent, pendingForThread, pendingForBoard }
})
