<script setup>
import { useUiStore } from '../stores/ui'
import { useSubmissionsStore } from '../stores/submissions'
import { Badge } from './ui/badge'
import { Home, List, Bell } from 'lucide-vue-next'

const ui = useUiStore()
const submissions = useSubmissionsStore()
</script>

<template>
  <div class="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-card border-t border-border">
    <div class="flex items-center justify-around h-12">
      <router-link :to="{ name: 'home' }" class="text-muted-foreground hover:text-foreground text-xs flex flex-col items-center gap-0.5 transition-colors">
        <Home class="w-5 h-5" aria-hidden="true" />
        <span>Feed</span>
      </router-link>

      <router-link :to="{ name: 'boards' }" class="text-muted-foreground hover:text-foreground text-xs flex flex-col items-center gap-0.5 transition-colors">
        <List class="w-5 h-5" aria-hidden="true" />
        <span>Boards</span>
      </router-link>

      <button
        @click="ui.toggleSidebar()"
        class="relative text-xs flex flex-col items-center gap-0.5 transition-colors"
        :class="ui.sidebarOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
      >
        <Bell class="w-5 h-5" aria-hidden="true" />
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
