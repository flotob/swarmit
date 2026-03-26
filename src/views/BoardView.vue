<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useBoard } from '../composables/useBoard'
import PostCard from '../components/PostCard.vue'
import CuratorBar from '../components/CuratorBar.vue'
import { Skeleton } from '../components/ui/skeleton'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Button } from '../components/ui/button'

const route = useRoute()
const slug = computed(() => route.params.slug)
const { board, curators, boardIndex, isLoading, isError, error, curatorAddress, curatorProfile } = useBoard(slug)
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-foreground">
        {{ board?.title || `r/${slug}` }}
      </h1>
      <p v-if="board?.description" class="text-muted-foreground mt-1">
        {{ board.description }}
      </p>
    </div>

    <Button as-child class="mb-4">
      <router-link :to="{ name: 'compose-post', params: { slug } }">
        Submit Post
      </router-link>
    </Button>

    <CuratorBar
      v-if="curatorAddress"
      :curator-name="curatorProfile?.name"
      :curator-address="curatorAddress"
      :curators="curators"
      :context="slug"
    />

    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="rounded-lg border border-border p-4">
        <Skeleton class="h-4 w-3/4 mb-3" />
        <Skeleton class="h-3 w-full mb-2" />
        <Skeleton class="h-3 w-1/2" />
      </div>
    </div>

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
</template>
