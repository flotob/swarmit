<script setup>
import { useSubmissionsStore } from '../stores/submissions'
import { useUiStore } from '../stores/ui'
import { useRouter } from 'vue-router'
import { refToHex } from '../protocol/references.js'
import { timeAgo } from '../lib/format.js'
import { STATUS, STATUS_ICONS, STATUS_LABELS } from '../lib/submission-status.js'

const store = useSubmissionsStore()
const ui = useUiStore()
const router = useRouter()

const statusColors = {
  [STATUS.PUBLISHED]: 'text-gray-500',
  [STATUS.ANNOUNCED]: 'text-yellow-500',
  [STATUS.WAITING]: 'text-orange-400 animate-pulse',
  [STATUS.CURATED]: 'text-green-500',
  [STATUS.SETTLED]: 'text-gray-600',
}

function handleClick(item) {
  if (item.status === STATUS.CURATED || item.status === STATUS.SETTLED) {
    const rootRef = item.kind === 'post' ? item.submissionRef : item.rootSubmissionId
    const hex = refToHex(rootRef)
    if (hex && item.boardSlug) {
      router.push({ name: 'thread', params: { slug: item.boardSlug, rootSubId: hex } })
      return
    }
  }
  const hex = refToHex(item.submissionRef)
  if (hex) {
    router.push({ name: 'submission-detail', params: { submissionRef: hex } })
  }
}
</script>

<template>
  <div class="min-w-0">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Your Activity
      </h3>
      <button
        @click="ui.closeSidebar()"
        class="hidden lg:block text-gray-600 hover:text-gray-400 text-xs"
      >
        Hide
      </button>
    </div>

    <template v-if="store.recent.length">
      <div class="space-y-1.5">
        <div
          v-for="item in store.recent"
          :key="item.submissionRef"
          @click="handleClick(item)"
          class="flex items-start gap-2 p-2 rounded-md hover:bg-gray-800/50 cursor-pointer transition-colors"
        >
          <span :class="statusColors[item.status]" class="text-sm mt-0.5 shrink-0">
            {{ STATUS_ICONS[item.status] }}
          </span>

          <div class="min-w-0 flex-1">
            <div class="text-sm text-gray-300 truncate">
              <span class="text-gray-500 text-xs">{{ item.kind }}</span>
              {{ item.title || `in r/${item.boardSlug}` }}
            </div>

            <div class="text-xs text-gray-600 mt-0.5">
              <template v-if="item.status === 'curated' || item.status === 'settled'">
                {{ item.curatorPickups.length }} curator{{ item.curatorPickups.length !== 1 ? 's' : '' }}
                · {{ timeAgo(item.curatorPickups[item.curatorPickups.length - 1]?.pickedUpAt || item.createdAt) }}
              </template>
              <template v-else-if="item.status === 'waiting'">
                {{ STATUS_LABELS.waiting }}
              </template>
              <template v-else>
                {{ STATUS_LABELS[item.status] }} · {{ timeAgo(item.createdAt) }}
              </template>
            </div>
          </div>
        </div>
      </div>

      <p class="text-[10px] text-gray-700 mt-3">
        Tracked from this browser only
      </p>
    </template>

    <p v-else class="text-sm text-gray-600">
      No recent activity. Submit a post or reply to track it here.
    </p>
  </div>
</template>
