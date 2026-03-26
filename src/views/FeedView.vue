<script setup>
import { useGlobalFeed } from '../composables/useGlobalFeed'
import PostCard from '../components/PostCard.vue'
import CuratorBar from '../components/CuratorBar.vue'
import { Skeleton } from '../components/ui/skeleton'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Button } from '../components/ui/button'

const { feed, curators, isLoading, isError, error, curatorAddress, curatorProfile } = useGlobalFeed()
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-foreground">Feed</h1>
      <router-link :to="{ name: 'boards' }">
        <Button variant="ghost" size="sm">Browse boards</Button>
      </router-link>
    </div>

    <CuratorBar
      v-if="curatorAddress"
      :curator-name="curatorProfile?.name"
      :curator-address="curatorAddress"
      :curators="curators"
      context="_global"
    />

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="rounded-lg border border-border p-4">
        <Skeleton class="h-4 w-3/4 mb-3" />
        <Skeleton class="h-3 w-full mb-2" />
        <Skeleton class="h-3 w-1/2" />
      </div>
    </div>

    <!-- Error -->
    <Alert v-else-if="isError" variant="destructive">
      <AlertDescription>{{ error?.message || 'Failed to load feed' }}</AlertDescription>
    </Alert>

    <!-- No feed available -->
    <div v-else-if="!feed?.entries?.length" class="text-center py-16">
      <p class="text-lg mb-2 text-foreground">No curated feed available yet.</p>
      <p class="text-sm mb-4 text-muted-foreground">Curators haven't published a cross-board feed, or no posts exist.</p>
      <router-link :to="{ name: 'boards' }">
        <Button variant="outline">Browse boards instead</Button>
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
