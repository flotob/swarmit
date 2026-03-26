<script setup>
import { useUiStore } from '../stores/ui'
import { useSubmissionsStore } from '../stores/submissions'

const ui = useUiStore()
const submissions = useSubmissionsStore()
</script>

<template>
  <div class="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-gray-900 border-t border-gray-800">
    <div class="flex items-center justify-around h-12">
      <router-link :to="{ name: 'home' }" class="text-gray-500 hover:text-gray-300 text-xs flex flex-col items-center gap-0.5">
        <span class="text-base" aria-hidden="true">&#9679;</span>
        <span>Feed</span>
      </router-link>

      <button
        @click="ui.toggleSidebar()"
        class="relative text-xs flex flex-col items-center gap-0.5"
        :class="ui.sidebarOpen ? 'text-orange-400' : 'text-gray-500 hover:text-gray-300'"
      >
        <span class="text-base" aria-hidden="true">&#9679;</span>
        <span>Activity</span>
        <span
          v-if="submissions.pending.length"
          class="absolute -top-1 left-1/2 ml-2 min-w-4 h-4 flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-bold px-1"
        >
          {{ submissions.pending.length }}
        </span>
      </button>
    </div>
  </div>
</template>
