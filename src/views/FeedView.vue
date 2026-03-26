<script setup>
import { useGlobalFeed } from '../composables/useGlobalFeed'
import PostCard from '../components/PostCard.vue'
import CuratorBanner from '../components/CuratorBanner.vue'

const { feed, isLoading, isError, error, curatorAddress, curatorProfile } = useGlobalFeed()
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold">Feed</h2>
      <router-link
        :to="{ name: 'boards' }"
        class="text-sm text-gray-500 hover:text-gray-300"
      >
        Browse boards
      </router-link>
    </div>

    <CuratorBanner
      v-if="curatorAddress"
      :curator-name="curatorProfile?.name"
      :curator-address="curatorAddress"
    />

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="h-24 rounded-lg bg-gray-800 animate-pulse" />
    </div>

    <!-- Error -->
    <div v-else-if="isError" class="p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-400">
      {{ error?.message || 'Failed to load feed' }}
    </div>

    <!-- No feed available -->
    <div v-else-if="!feed?.entries?.length" class="text-center py-16 text-gray-500">
      <p class="text-lg mb-2">No curated feed available yet.</p>
      <p class="text-sm mb-4">Curators haven't published a cross-board feed, or no posts exist.</p>
      <router-link
        :to="{ name: 'boards' }"
        class="text-orange-400 hover:text-orange-300 text-sm"
      >
        Browse boards instead
      </router-link>
    </div>

    <!-- Feed entries -->
    <div v-else class="space-y-2">
      <PostCard
        v-for="entry in feed.entries"
        :key="entry.submissionRef"
        :entry="entry"
        :board-slug="entry.boardId"
        show-board
      />
    </div>
  </div>
</template>
