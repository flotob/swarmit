<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useBoard } from '../composables/useBoard'
import { useViewsStore, boardScope } from '../stores/views'
import PostCard from '../components/PostCard.vue'
import PostSkeletonList from '../components/PostSkeletonList.vue'
import CuratorBar from '../components/CuratorBar.vue'
import BoardSidebar from '../components/BoardSidebar.vue'
import { Alert, AlertDescription } from '../components/ui/alert'

const route = useRoute()
const slug = computed(() => route.params.slug)
const { board, curators, boardIndex, showSkeleton, isError, error, curatorAddress, curatorProfile } = useBoard(slug)

// Scroll to top on view switch. Route-level slug changes are handled
// globally by the router's scrollBehavior; this watcher only covers
// in-place view-tab clicks (same route, different views pref).
const viewsStore = useViewsStore()
watch(
  () => viewsStore.getView(boardScope(slug.value)),
  () => window.scrollTo({ top: 0 }),
)
</script>

<template>
  <div class="lg:grid lg:grid-cols-[1fr_18rem] lg:gap-6">
    <div>
      <CuratorBar
        v-if="curatorAddress"
        :curator-name="curatorProfile?.name"
        :curator-address="curatorAddress"
        :curators="curators"
        :context="slug"
      />

      <PostSkeletonList v-if="showSkeleton" :count="3" />

      <Alert v-else-if="isError" variant="destructive">
        <AlertDescription>{{ error?.message || 'Failed to load board' }}</AlertDescription>
      </Alert>

      <div v-else-if="!boardIndex?.entries?.length" class="text-center py-16">
        <p class="text-lg mb-2 text-foreground">No posts yet.</p>
        <p class="text-sm text-muted-foreground">Be the first — submit a post to get the conversation started.</p>
      </div>

      <div v-else>
        <PostCard
          v-for="(entry, i) in boardIndex.entries"
          :key="entry.submissionId"
          :entry="entry"
          :board-slug="slug"
          :rank="i + 1"
        />
      </div>
    </div>

    <div class="hidden lg:block">
      <div class="sticky top-[4.75rem]">
        <BoardSidebar
          :slug="slug"
          :board="board"
          :post-count="boardIndex?.entries?.length"
          :curator-name="curatorProfile?.name"
        />
      </div>
    </div>
  </div>
</template>
