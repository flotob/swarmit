<script setup>
import { STATUS, STATUS_LABELS, STATUS_PANEL_COLORS } from '../lib/submission-status.js'
import { Loader2 } from 'lucide-vue-next'

defineProps({
  status: String,
  curatorCount: { type: Number, default: 0 },
  isRefreshing: Boolean,
})
</script>

<template>
  <div :class="STATUS_PANEL_COLORS[status]" class="py-1.5 px-3 my-1 rounded-md border text-xs italic flex items-center gap-1.5">
    <span v-if="status === STATUS.WAITING" class="animate-pulse">{{ STATUS_LABELS[STATUS.WAITING] }}</span>
    <template v-else-if="status === STATUS.CURATED || status === STATUS.SETTLED">
      <template v-if="isRefreshing">
        <Loader2 class="w-3 h-3 animate-spin" />
        Picked up by {{ curatorCount }} curator{{ curatorCount !== 1 ? 's' : '' }}. Refreshing thread...
      </template>
      <span v-else>
        Picked up by {{ curatorCount }} curator{{ curatorCount !== 1 ? 's' : '' }}
      </span>
    </template>
    <span v-else>{{ STATUS_LABELS[status] || 'Pending' }}</span>
  </div>
</template>
