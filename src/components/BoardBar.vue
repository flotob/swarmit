<script setup>
import { useCuratorBoards } from '../composables/useCuratorBoards'

const { boards } = useCuratorBoards()
</script>

<template>
  <div class="bg-board-bar text-header-foreground text-xs border-b border-header-border overflow-x-auto whitespace-nowrap">
    <div class="flex items-center gap-1 px-4 h-7">
      <span class="font-semibold uppercase tracking-wider mr-2 shrink-0 opacity-70">Boards</span>
      <template v-if="boards.length">
        <router-link
          v-for="slug in boards"
          :key="slug"
          :to="{ name: 'board', params: { slug } }"
          class="px-2 py-0.5 rounded hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
        >
          {{ slug }}
        </router-link>
      </template>
    </div>
  </div>
</template>
