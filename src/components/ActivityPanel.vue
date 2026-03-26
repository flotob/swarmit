<script setup>
import { useSubmissionsStore } from '../stores/submissions'
import { useUiStore } from '../stores/ui'
import { useRouter } from 'vue-router'
import { refToHex } from '../protocol/references.js'
import { timeAgo } from '../lib/format.js'
import { STATUS, STATUS_ICONS, STATUS_LABELS } from '../lib/submission-status.js'
import { Badge } from './ui/badge'

const store = useSubmissionsStore()
const ui = useUiStore()
const router = useRouter()

const statusColors = {
  [STATUS.PUBLISHED]: 'text-muted-foreground',
  [STATUS.ANNOUNCED]: 'text-yellow-600 dark:text-yellow-400',
  [STATUS.WAITING]: 'text-primary animate-pulse',
  [STATUS.CURATED]: 'text-green-600 dark:text-green-400',
  [STATUS.SETTLED]: 'text-muted-foreground/60',
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
      <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
        Activity
      </h3>
      <button
        @click="ui.closeSidebar()"
        class="hidden lg:block text-muted-foreground/60 hover:text-muted-foreground text-xs transition-colors"
      >
        Hide
      </button>
    </div>

    <template v-if="store.recent.length">
      <div class="space-y-1">
        <div
          v-for="item in store.recent"
          :key="item.submissionRef"
          @click="handleClick(item)"
          class="flex items-start gap-2 p-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
        >
          <span :class="statusColors[item.status]" class="text-sm mt-0.5 shrink-0">
            {{ STATUS_ICONS[item.status] }}
          </span>

          <div class="min-w-0 flex-1">
            <div class="text-sm text-foreground truncate">
              <Badge variant="outline" class="text-[10px] mr-1 align-middle">{{ item.kind }}</Badge>
              {{ item.title || `r/${item.boardSlug}` }}
            </div>

            <div class="text-xs text-muted-foreground mt-0.5">
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

      <p class="text-[10px] text-muted-foreground/50 mt-3">
        Tracked from this browser only
      </p>
    </template>

    <p v-else class="text-sm text-muted-foreground">
      No recent activity. Submit a post or reply to track it here.
    </p>
  </div>
</template>
