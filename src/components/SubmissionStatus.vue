<script setup>
import { STATUS, STATUS_LABELS } from '../lib/submission-status.js'
import { Badge } from './ui/badge'

defineProps({
  status: String,
  curatorCount: { type: Number, default: 0 },
})

const colors = {
  [STATUS.PUBLISHED]: 'bg-secondary text-muted-foreground border-border',
  [STATUS.ANNOUNCED]: 'bg-warning/10 text-warning border-warning/30',
  [STATUS.WAITING]: 'bg-primary/10 text-primary border-primary/30',
  [STATUS.CURATED]: 'bg-success/10 text-success border-success/30',
  [STATUS.SETTLED]: 'bg-secondary text-muted-foreground border-border',
}
</script>

<template>
  <div :class="colors[status]" class="py-1.5 px-3 my-1 rounded-md border text-xs italic">
    <span v-if="status === STATUS.WAITING" class="animate-pulse">{{ STATUS_LABELS[STATUS.WAITING] }}</span>
    <span v-else-if="status === STATUS.CURATED || status === STATUS.SETTLED">
      Picked up by {{ curatorCount }} curator{{ curatorCount !== 1 ? 's' : '' }}
    </span>
    <span v-else>{{ STATUS_LABELS[status] || 'Pending' }}</span>
  </div>
</template>
