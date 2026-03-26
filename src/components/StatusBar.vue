<script setup>
import { Circle, CircleDot, CircleCheck, CircleX, CircleDashed } from 'lucide-vue-next'

defineProps({
  steps: Array,
})

const icons = {
  pending: Circle,
  active: CircleDot,
  done: CircleCheck,
  error: CircleX,
  skipped: CircleDashed,
}

const colors = {
  pending: 'text-muted-foreground',
  active: 'text-primary',
  done: 'text-success',
  error: 'text-destructive',
  skipped: 'text-muted-foreground',
}
</script>

<template>
  <div class="space-y-1.5 text-sm">
    <div
      v-for="step in steps"
      :key="step.name"
      class="flex items-center gap-2"
    >
      <component :is="icons[step.status] || icons.pending" class="w-4 h-4 shrink-0" :class="colors[step.status] || colors.pending" />
      <span :class="step.status === 'pending' ? 'text-muted-foreground' : 'text-foreground'">
        {{ step.name }}
      </span>
      <span v-if="step.detail" class="text-muted-foreground text-xs break-all">
        — {{ step.detail }}
      </span>
    </div>
  </div>
</template>
