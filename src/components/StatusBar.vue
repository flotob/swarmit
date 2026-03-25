<script setup>
defineProps({
  steps: Array, // [{ name, status, detail }]
})

const icons = {
  pending: '○',
  active: '◉',
  done: '●',
  error: '✗',
  skipped: '◌',
}

const colors = {
  pending: 'text-gray-600',
  active: 'text-orange-400',
  done: 'text-green-500',
  error: 'text-red-500',
  skipped: 'text-gray-600',
}
</script>

<template>
  <div class="space-y-1 font-mono text-sm">
    <div
      v-for="step in steps"
      :key="step.name"
      class="flex items-baseline gap-2"
    >
      <span :class="colors[step.status] || 'text-gray-600'">
        {{ icons[step.status] || icons.pending }}
      </span>
      <span :class="step.status === 'pending' ? 'text-gray-600' : 'text-gray-300'">
        {{ step.name }}
      </span>
      <span v-if="step.detail" class="text-gray-500 text-xs break-all">
        — {{ step.detail }}
      </span>
    </div>
  </div>
</template>
