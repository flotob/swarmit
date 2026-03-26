<script setup>
defineProps({
  status: String,
  curatorCount: { type: Number, default: 0 },
})

const labels = {
  announced: 'Announced on-chain',
  waiting: 'Waiting for curators...',
  curated: 'Curated',
  settled: 'Curated',
}

const colors = {
  announced: 'bg-yellow-900/20 border-yellow-800/30 text-yellow-500/70',
  waiting: 'bg-orange-900/10 border-orange-800/30 text-orange-400/70',
  curated: 'bg-green-900/20 border-green-800/30 text-green-500/70',
  settled: 'bg-gray-800/30 border-gray-700/30 text-gray-500',
}
</script>

<template>
  <div :class="colors[status]" class="py-1.5 px-3 my-1 rounded-md border text-xs italic">
    <span v-if="status === 'waiting'" class="animate-pulse">{{ labels[status] }}</span>
    <span v-else-if="status === 'curated' || status === 'settled'">
      Picked up by {{ curatorCount }} curator{{ curatorCount !== 1 ? 's' : '' }}
    </span>
    <span v-else>{{ labels[status] || 'Pending' }}</span>
  </div>
</template>
