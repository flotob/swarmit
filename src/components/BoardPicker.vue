<script setup>
import { computed } from 'vue'
import { useCuratorBoards } from '../composables/useCuratorBoards'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { ChevronDown, Check } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: String, default: null },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const { boards, isLoading } = useCuratorBoards()

const label = computed(() => props.modelValue ? `r/${props.modelValue}` : 'Select a board')

function selectBoard(slug) {
  emit('update:modelValue', slug)
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger
      :disabled="disabled"
      class="inline-flex items-center justify-between gap-2 w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground hover:bg-accent/50 disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:outline-2 focus-visible:outline-ring transition-colors"
    >
      <span :class="modelValue ? 'font-medium' : 'text-muted-foreground'">{{ label }}</span>
      <ChevronDown class="w-4 h-4 opacity-60 shrink-0" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="min-w-[12rem] max-h-[20rem] overflow-y-auto">
      <DropdownMenuItem v-if="isLoading" disabled class="text-muted-foreground">
        Loading…
      </DropdownMenuItem>
      <DropdownMenuItem v-else-if="!boards.length" disabled class="text-muted-foreground">
        No boards available
      </DropdownMenuItem>
      <DropdownMenuItem
        v-for="slug in boards"
        :key="slug"
        class="cursor-pointer flex items-center justify-between"
        @click="selectBoard(slug)"
      >
        <span class="truncate">r/{{ slug }}</span>
        <Check v-if="slug === modelValue" class="w-4 h-4 text-primary shrink-0 ml-2" />
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
