<script setup>
import { Skeleton } from './ui/skeleton'

defineProps({
  count: { type: Number, default: 3 },
})
</script>

<template>
  <div class="space-y-3">
    <div v-for="i in count" :key="i" class="rounded-lg border border-border p-4">
      <Skeleton class="h-4 w-3/4 mb-3" />
      <Skeleton class="h-3 w-full mb-2" />
      <Skeleton class="h-3 w-1/2" />
    </div>
  </div>
</template>
