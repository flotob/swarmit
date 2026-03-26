<script setup>
import { useUiStore } from '../stores/ui'
import { useSubmissionsStore } from '../stores/submissions'
import { Badge } from './ui/badge'

const ui = useUiStore()
const submissions = useSubmissionsStore()
</script>

<template>
  <div class="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-card border-t border-border">
    <div class="flex items-center justify-around h-12">
      <router-link :to="{ name: 'home' }" class="text-muted-foreground hover:text-foreground text-xs flex flex-col items-center gap-0.5 transition-colors">
        <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
        <span>Feed</span>
      </router-link>

      <router-link :to="{ name: 'boards' }" class="text-muted-foreground hover:text-foreground text-xs flex flex-col items-center gap-0.5 transition-colors">
        <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" /></svg>
        <span>Boards</span>
      </router-link>

      <button
        @click="ui.toggleSidebar()"
        class="relative text-xs flex flex-col items-center gap-0.5 transition-colors"
        :class="ui.sidebarOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
      >
        <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>
        <span>Activity</span>
        <Badge
          v-if="submissions.pending.length"
          class="absolute -top-1 left-1/2 ml-1 h-4 min-w-4 px-1 text-[10px] justify-center"
        >
          {{ submissions.pending.length }}
        </Badge>
      </button>
    </div>
  </div>
</template>
