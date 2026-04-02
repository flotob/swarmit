<script setup>
import { computed } from 'vue'
import { useViewsStore } from '../stores/views.js'
import { Button } from './ui/button'

const props = defineProps({
  scope: String,
  availableViews: Object,
})

const views = useViewsStore()

const KNOWN_ORDER = ['new', 'best', 'hot', 'rising', 'controversial']

const viewIds = computed(() => {
  if (!props.availableViews) return []
  const keys = Object.keys(props.availableViews)
  return [
    ...KNOWN_ORDER.filter((id) => keys.includes(id)),
    ...keys.filter((id) => !KNOWN_ORDER.includes(id)),
  ]
})

const activeView = computed(() => views.getView(props.scope))

function select(viewId) {
  // Clicking the already-active view clears the preference (back to default)
  views.setView(props.scope, viewId === activeView.value ? null : viewId)
}

function label(id) {
  return id.charAt(0).toUpperCase() + id.slice(1)
}
</script>

<template>
  <div v-if="viewIds.length >= 1" class="flex items-center gap-1">
    <Button
      v-for="id in viewIds"
      :key="id"
      variant="ghost"
      size="sm"
      class="h-7 px-2.5 text-xs font-medium"
      :class="activeView === id ? 'bg-accent text-foreground' : 'text-muted-foreground'"
      @click="select(id)"
    >
      {{ label(id) }}
    </Button>
  </div>
</template>
