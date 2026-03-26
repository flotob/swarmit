<script setup>
import { STATUS, STATUS_LABELS, STATUS_PANEL_COLORS } from '../lib/submission-status.js'

defineProps({
  status: String,
  curatorCount: { type: Number, default: 0 },
})
</script>

<template>
  <div :class="STATUS_PANEL_COLORS[status]" class="py-1.5 px-3 my-1 rounded-md border text-xs italic">
    <span v-if="status === STATUS.WAITING" class="animate-pulse">{{ STATUS_LABELS[STATUS.WAITING] }}</span>
    <span v-else-if="status === STATUS.CURATED || status === STATUS.SETTLED">
      Picked up by {{ curatorCount }} curator{{ curatorCount !== 1 ? 's' : '' }}
    </span>
    <span v-else>{{ STATUS_LABELS[status] || 'Pending' }}</span>
  </div>
</template>
