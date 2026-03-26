<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useThread } from '../composables/useThread'
import { useSubmissionsStore } from '../stores/submissions'
import { threadIndent } from '../lib/format.js'
import ReplyNode from '../components/ReplyNode.vue'
import ReplyForm from '../components/ReplyForm.vue'
import CuratorBar from '../components/CuratorBar.vue'
import SubmissionStatus from '../components/SubmissionStatus.vue'
import { Skeleton } from '../components/ui/skeleton'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Button } from '../components/ui/button'

const route = useRoute()
const slug = computed(() => route.params.slug)
const rootSubId = computed(() => route.params.rootSubId)

const { thread, curators, isLoading, isError, error, rootSubRef, curatorAddress, curatorProfile } = useThread(slug, rootSubId)
const submissions = useSubmissionsStore()

const replyingTo = ref(null)

const pendingReplies = computed(() => {
  if (!rootSubRef.value) return []
  const tracked = submissions.pendingForThread(rootSubRef.value)
  const curatorNodeRefs = new Set(
    (thread.value?.nodes || []).map((n) => n.submissionId)
  )
  return tracked.filter((t) => !curatorNodeRefs.has(t.submissionRef))
})

function handleReply(node) { replyingTo.value = node }
function cancelReply() { replyingTo.value = null }
function onReplyPublished() { replyingTo.value = null }

function pendingForNode(nodeSubmissionId) {
  return pendingReplies.value.filter((p) => p.parentSubmissionId === nodeSubmissionId)
}
</script>

<template>
  <div>
    <Button variant="ghost" size="sm" as-child class="mb-4">
      <router-link :to="{ name: 'board', params: { slug } }">
        &larr; r/{{ slug }}
      </router-link>
    </Button>

    <CuratorBar
      v-if="curatorAddress"
      :curator-name="curatorProfile?.name"
      :curator-address="curatorAddress"
      :curators="curators"
      :context="slug"
    />

    <div v-if="isLoading" class="space-y-3 mt-4">
      <Skeleton class="h-32 rounded-lg" />
      <Skeleton v-for="i in 3" :key="i" class="h-16 rounded-lg" />
    </div>

    <Alert v-else-if="isError" variant="destructive" class="mt-4">
      <AlertDescription>{{ error?.message || 'Failed to load thread' }}</AlertDescription>
    </Alert>

    <div v-else-if="!thread?.nodes?.length" class="text-center py-16">
      <p class="text-lg mb-2 text-foreground">Thread not found.</p>
      <p class="text-sm text-muted-foreground">This thread may not be indexed by any curator yet.</p>
    </div>

    <div v-else class="mt-2">
      <template v-for="node in thread.nodes" :key="node.submissionId">
        <ReplyNode
          :node="node"
          :is-root="node.parentSubmissionId === null"
          @reply="handleReply"
        />

        <div v-if="replyingTo?.submissionId === node.submissionId" :style="{ marginLeft: threadIndent((node.depth || 0) + 1) }">
          <ReplyForm
            :board-slug="slug"
            :parent-submission-id="node.submissionId"
            :root-submission-id="rootSubRef"
            @published="onReplyPublished"
            @cancel="cancelReply"
          />
        </div>

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
