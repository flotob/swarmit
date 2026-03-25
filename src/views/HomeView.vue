<script setup>
import { useBoardList } from '../composables/useBoardList'
import { useRouter } from 'vue-router'

const router = useRouter()
const { data: boards, isLoading, isError, error } = useBoardList()

function goToBoard(slug) {
  router.push({ name: 'board', params: { slug } })
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold">Boards</h2>
      <router-link
        to="/create-board"
        class="px-4 py-2 text-sm font-medium rounded-md bg-orange-500 text-white hover:bg-orange-600 transition-colors"
      >
        Create Board
      </router-link>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-20 rounded-lg bg-gray-800 animate-pulse" />
    </div>

    <!-- Error -->
    <div v-else-if="isError" class="p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-400">
      {{ error?.message || 'Failed to load boards' }}
    </div>

    <!-- Empty -->
    <div v-else-if="!boards?.length" class="text-center py-16 text-gray-500">
      <p class="text-lg mb-2">No boards registered yet.</p>
      <p class="text-sm">Be the first — create a board to get started.</p>
    </div>

    <!-- Board cards -->
    <div v-else class="space-y-2">
      <div
        v-for="b in boards"
        :key="b.slug"
        @click="goToBoard(b.slug)"
        class="p-4 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 cursor-pointer transition-colors"
      >
        <div class="text-base font-semibold text-gray-100">
          {{ b.board?.title || `r/${b.slug}` }}
        </div>
        <div v-if="b.board?.description" class="text-sm text-gray-500 mt-1">
          {{ b.board.description }}
        </div>
        <div class="text-xs text-gray-600 mt-2 font-mono">
          r/{{ b.slug }}
        </div>
      </div>
    </div>
  </div>
</template>
