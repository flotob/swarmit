<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useBoard } from '../composables/useBoard'
import { truncateAddress } from '../lib/format.js'
import PostCard from '../components/PostCard.vue'
import CuratorBanner from '../components/CuratorBanner.vue'

const route = useRoute()
const slug = computed(() => route.params.slug)
const { board, boardIndex, isLoading, isError, error, selectedCurator, showCuratorBanner } = useBoard(slug)
</script>

<template>
  <div>
    <!-- Board header -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold">
        {{ board?.title || `r/${slug}` }}
      </h2>
      <p v-if="board?.description" class="text-gray-500 mt-1">
        {{ board.description }}
      </p>
    </div>

    <!-- Submit post button -->
    <router-link
      :to="{ name: 'compose-post', params: { slug } }"
      class="inline-block mb-4 px-4 py-2 text-sm font-medium rounded-md bg-orange-500 text-white hover:bg-orange-600 transition-colors"
    >
      Submit Post
    </router-link>

    <!-- Curator banner -->
    <CuratorBanner
      v-if="showCuratorBanner && selectedCurator"
      :curator-name="selectedCurator.profile?.name"
      :curator-address="selectedCurator.address"
    />

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-2">
      <div v-for="i in 3" :key="i" class="h-24 rounded-lg bg-gray-800 animate-pulse" />
    </div>

    <!-- Error -->
    <div v-else-if="isError" class="p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-400">
      {{ error?.message || 'Failed to load board' }}
    </div>

    <!-- Empty -->
    <div v-else-if="!boardIndex?.entries?.length" class="text-center py-16 text-gray-500">
      <p class="text-lg mb-2">No posts yet.</p>
      <p class="text-sm">Be the first — submit a post to get the conversation started.</p>
    </div>

    <!-- Post list -->
    <div v-else class="space-y-2">
      <PostCard
        v-for="entry in boardIndex.entries"
        :key="entry.submissionId"
        :entry="entry"
        :board-slug="slug"
      />
    </div>

    <!-- Curator info -->
    <div v-if="selectedCurator && !isLoading" class="mt-6 text-xs text-gray-600">
      Curated by {{ selectedCurator.profile?.name || truncateAddress(selectedCurator.address) }}
    </div>
  </div>
</template>
