<script setup>
import { watch } from 'vue'
import { useGlobalFeed } from '../composables/useGlobalFeed'
import { useViewsStore, GLOBAL_SCOPE } from '../stores/views'
import PostCard from '../components/PostCard.vue'
import PostSkeletonList from '../components/PostSkeletonList.vue'
import CuratorBar from '../components/CuratorBar.vue'
import FeedSidebar from '../components/FeedSidebar.vue'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Button } from '../components/ui/button'

const { feed, curators, showSkeleton, isError, error, curatorAddress, curatorProfile } = useGlobalFeed()

// Scroll to top whenever the user switches to a different view.
const viewsStore = useViewsStore()
watch(
  () => viewsStore.getView(GLOBAL_SCOPE),
  () => window.scrollTo({ top: 0 }),
)
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

      <PostSkeletonList v-if="showSkeleton" :count="5" />

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
