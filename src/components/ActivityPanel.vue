<script setup>
import { computed } from 'vue'
import { useSubmissionsStore } from '../stores/submissions'
import { useUiStore } from '../stores/ui'
import { useRouter } from 'vue-router'
import { refToHex } from '../protocol/references.js'
import { timeAgo } from '../lib/format.js'
import { STATUS, STATUS_ICONS, STATUS_LABELS } from '../lib/submission-status.js'
import { Badge } from './ui/badge'
import { X } from 'lucide-vue-next'

const store = useSubmissionsStore()
const ui = useUiStore()
const router = useRouter()

const queued = computed(() =>
  store.items.filter((i) =>
    i.status === STATUS.WAITING || i.status === STATUS.PUBLISHED || i.status === STATUS.ANNOUNCED
  )
)

const curated = computed(() =>
  store.items.filter((i) => i.status === STATUS.CURATED).slice(0, 10)
)

const statusColors = {
  [STATUS.PUBLISHED]: 'text-muted-foreground',
  [STATUS.ANNOUNCED]: 'text-warning',
  [STATUS.WAITING]: 'text-primary animate-pulse',
}

function handleClick(item) {
  if (item.status === STATUS.CURATED || item.status === STATUS.SETTLED) {
    const rootRef = item.kind === 'post' ? item.submissionRef : item.rootSubmissionId
    const hex = refToHex(rootRef)
    if (hex && item.boardSlug) {
      router.push({ name: 'thread', params: { slug: item.boardSlug, rootSubId: hex } })
      ui.closeSidebar()
      return
    }
  }
  const hex = refToHex(item.submissionRef)
  if (hex) {
    router.push({ name: 'submission-detail', params: { submissionRef: hex } })
    ui.closeSidebar()
  }
}
</script>

<template>
  <div class="min-w-0">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
        Activity
      </h3>
      <button
        @click="ui.closeSidebar()"
        class="text-muted-foreground/60 hover:text-foreground transition-colors"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <template v-if="queued.length || curated.length">
      <div v-if="queued.length">
        <h4 class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Queue
        </h4>
        <div class="space-y-1">
          <div
            v-for="item in queued"
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
                <template v-if="item.status === STATUS.WAITING">
                  {{ STATUS_LABELS[STATUS.WAITING] }}
                </template>
                <template v-else>
                  {{ STATUS_LABELS[item.status] }} · {{ timeAgo(item.createdAt) }}
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="curated.length" :class="queued.length ? 'mt-5' : ''">
        <h4 class="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-2">
          Curated
        </h4>
        <div class="space-y-1 opacity-60">
          <div
            v-for="item in curated"
            :key="item.submissionRef"
            @click="handleClick(item)"
            class="flex items-start gap-2 p-2 rounded-md hover:bg-accent hover:opacity-100 cursor-pointer transition-all"
          >
            <span class="text-sm mt-0.5 shrink-0 text-success">
              {{ STATUS_ICONS[STATUS.CURATED] }}
            </span>
            <div class="min-w-0 flex-1">
              <div class="text-sm text-foreground truncate">
                <Badge variant="outline" class="text-[10px] mr-1 align-middle">{{ item.kind }}</Badge>
                {{ item.title || `r/${item.boardSlug}` }}
              </div>
              <div class="text-xs text-muted-foreground mt-0.5">
                {{ item.curatorPickups.length }} curator{{ item.curatorPickups.length !== 1 ? 's' : '' }}
                · {{ timeAgo(item.curatorPickups[item.curatorPickups.length - 1]?.pickedUpAt || item.createdAt) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <p class="text-[10px] text-muted-foreground/40 mt-4">
        Tracked from this browser only
      </p>
    </template>

    <p v-else class="text-sm text-muted-foreground">
      No recent activity. Submit a post or reply to track it here.
    </p>
  </div>
</template>
