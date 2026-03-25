<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useThread } from '../composables/useThread'
import { truncateAddress } from '../lib/format.js'
import ReplyNode from '../components/ReplyNode.vue'
import CuratorBanner from '../components/CuratorBanner.vue'

const route = useRoute()
const slug = computed(() => route.params.slug)
const rootSubId = computed(() => route.params.rootSubId)

const { thread, isLoading, isError, error, selectedCurator, showCuratorBanner } = useThread(slug, rootSubId)

function handleReply(node) {
  // UP9 will implement inline reply
  console.log('Reply to:', node.submissionId)
}
</script>

<template>
  <div>
    <!-- Back link -->
    <router-link
      :to="{ name: 'board', params: { slug } }"
      class="text-sm text-gray-500 hover:text-gray-300 mb-4 inline-block"
    >
      &larr; r/{{ slug }}
    </router-link>

    <!-- Curator banner -->
    <CuratorBanner
      v-if="showCuratorBanner && selectedCurator"
      :curator-name="selectedCurator.profile?.name"
      :curator-address="selectedCurator.address"
    />

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-3 mt-4">
      <div class="h-32 rounded-lg bg-gray-800 animate-pulse" />
      <div v-for="i in 3" :key="i" class="h-16 rounded-lg bg-gray-800 animate-pulse" />
    </div>

    <!-- Error -->
    <div v-else-if="isError" class="p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-400 mt-4">
      {{ error?.message || 'Failed to load thread' }}
    </div>

    <!-- Empty -->
    <div v-else-if="!thread?.nodes?.length" class="text-center py-16 text-gray-500">
      <p class="text-lg mb-2">Thread not found.</p>
      <p class="text-sm">This thread may not be indexed by any curator yet.</p>
    </div>

    <!-- Thread -->
    <div v-else class="mt-2">
      <ReplyNode
        v-for="node in thread.nodes"
        :key="node.submissionId"
        :node="node"
        :is-root="node.parentSubmissionId === null"
        @reply="handleReply"
      />

      <!-- Curator info -->
      <div v-if="selectedCurator" class="mt-6 text-xs text-gray-600">
        Curated by {{ selectedCurator.profile?.name || truncateAddress(selectedCurator.address) }}
      </div>
    </div>
  </div>
</template>
