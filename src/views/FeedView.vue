<script setup>
import { useGlobalFeed } from '../composables/useGlobalFeed'
import PostCard from '../components/PostCard.vue'
import CuratorBar from '../components/CuratorBar.vue'
import FeedSidebar from '../components/FeedSidebar.vue'
import { Skeleton } from '../components/ui/skeleton'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Button } from '../components/ui/button'

const { feed, curators, isLoading, isError, error, curatorAddress, curatorProfile } = useGlobalFeed()
</script>

<template>
  <div class="lg:grid lg:grid-cols-[1fr_18rem] lg:gap-6">
    <!-- Main feed -->
    <div>
      <CuratorBar
        v-if="curatorAddress"
        :curator-name="curatorProfile?.name"
        :curator-address="curatorAddress"
        :curators="curators"
        context="_global"
      />

      <div v-if="isLoading" class="space-y-3">
        <div v-for="i in 5" :key="i" class="rounded-lg border border-border p-4">
          <Skeleton class="h-4 w-3/4 mb-3" />
          <Skeleton class="h-3 w-full mb-2" />
          <Skeleton class="h-3 w-1/2" />
        </div>
      </div>

      <Alert v-else-if="isError" variant="destructive">
        <AlertDescription>{{ error?.message || 'Failed to load feed' }}</AlertDescription>
      </Alert>

      <div v-else-if="!feed?.entries?.length" class="text-center py-16">
        <p class="text-lg mb-2 text-foreground">No curated feed available yet.</p>
        <p class="text-sm mb-4 text-muted-foreground">Curators haven't published a cross-board feed, or no posts exist.</p>
        <Button variant="outline" as-child>
          <router-link :to="{ name: 'boards' }">Browse boards instead</router-link>
        </Button>
      </div>

      <div v-else>
        <PostCard
          v-for="(entry, i) in feed.entries"
          :key="entry.submissionRef"
          :entry="entry"
          :board-slug="entry.boardId"
          :rank="i + 1"
          show-board
        />
      </div>
    </div>

    <!-- Right sidebar (desktop only) -->
    <div class="hidden lg:block">
      <div class="sticky top-[4.75rem]">
        <FeedSidebar />
      </div>
    </div>
  </div>
</template>
