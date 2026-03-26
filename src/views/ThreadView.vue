<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useThread } from '../composables/useThread'
import { useSubmissionsStore } from '../stores/submissions'
import { threadIndent } from '../lib/format.js'
import ReplyNode from '../components/ReplyNode.vue'
import ReplyForm from '../components/ReplyForm.vue'
import CuratorBanner from '../components/CuratorBanner.vue'
import SubmissionStatus from '../components/SubmissionStatus.vue'

const route = useRoute()
const slug = computed(() => route.params.slug)
const rootSubId = computed(() => route.params.rootSubId)

const { thread, isLoading, isError, error, rootSubRef, selectedCurator } = useThread(slug, rootSubId)
const submissions = useSubmissionsStore()

// Inline reply state
const replyingTo = ref(null)

// Pending replies — exclude any that already appear in the curator's thread nodes
const pendingReplies = computed(() => {
  if (!rootSubRef.value) return []
  const tracked = submissions.pendingForThread(rootSubRef.value)
  const curatorNodeRefs = new Set(
    (thread.value?.nodes || []).map((n) => n.submissionId)
  )
  // Once a reply appears in the curator's tree, don't show the pending badge
  return tracked.filter((t) => !curatorNodeRefs.has(t.submissionRef))
})

function handleReply(node) {
  replyingTo.value = node
}

function cancelReply() {
  replyingTo.value = null
}

function onReplyPublished() {
  replyingTo.value = null
}

function pendingForNode(nodeSubmissionId) {
  return pendingReplies.value.filter((p) => p.parentSubmissionId === nodeSubmissionId)
}
</script>

<template>
  <div>
    <router-link
      :to="{ name: 'board', params: { slug } }"
      class="text-sm text-gray-500 hover:text-gray-300 mb-4 inline-block"
    >
      &larr; r/{{ slug }}
    </router-link>

    <CuratorBanner
      v-if="selectedCurator"
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
      <template v-for="node in thread.nodes" :key="node.submissionId">
        <ReplyNode
          :node="node"
          :is-root="node.parentSubmissionId === null"
          @reply="handleReply"
        />

        <!-- Inline reply form -->
        <div v-if="replyingTo?.submissionId === node.submissionId" :style="{ marginLeft: threadIndent((node.depth || 0) + 1) }">
          <ReplyForm
            :board-slug="slug"
            :parent-submission-id="node.submissionId"
            :root-submission-id="rootSubRef"
            @published="onReplyPublished"
            @cancel="cancelReply"
          />
        </div>

        <!-- Pending replies from submissions store -->
        <div
          v-for="pending in pendingForNode(node.submissionId)"
          :key="pending.submissionRef"
          :style="{ marginLeft: threadIndent((node.depth || 0) + 1) }"
        >
          <SubmissionStatus
            :status="pending.status"
            :curator-count="pending.curatorPickups.length"
          />
        </div>
      </template>

    </div>
  </div>
</template>
