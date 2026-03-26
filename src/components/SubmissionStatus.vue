<script setup>
import { STATUS, STATUS_LABELS } from '../lib/submission-status.js'

defineProps({
  status: String,
  curatorCount: { type: Number, default: 0 },
})

const colors = {
  [STATUS.PUBLISHED]: 'bg-gray-800/30 border-gray-700/30 text-gray-400',
  [STATUS.ANNOUNCED]: 'bg-yellow-900/20 border-yellow-800/30 text-yellow-500/70',
  [STATUS.WAITING]: 'bg-orange-900/10 border-orange-800/30 text-orange-400/70',
  [STATUS.CURATED]: 'bg-green-900/20 border-green-800/30 text-green-500/70',
  [STATUS.SETTLED]: 'bg-gray-800/30 border-gray-700/30 text-gray-500',
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
