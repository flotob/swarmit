<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import { useThread } from '../composables/useThread'
import { useBoardMetadata } from '../composables/useBoard'
import { useSubmissionsStore } from '../stores/submissions'
import { STATUS } from '../lib/submission-status.js'
import { threadIndent } from '../lib/format.js'
import PostCard from '../components/PostCard.vue'
import ReplyNode from '../components/ReplyNode.vue'
import ReplyForm from '../components/ReplyForm.vue'
import CuratorBar from '../components/CuratorBar.vue'
import BoardSidebar from '../components/BoardSidebar.vue'
import SubmissionStatus from '../components/SubmissionStatus.vue'
import { Skeleton } from '../components/ui/skeleton'
import { Alert, AlertDescription } from '../components/ui/alert'

const route = useRoute()
const queryClient = useQueryClient()
const slug = computed(() => route.params.slug)
const rootSubId = computed(() => route.params.rootSubId)

const { thread, curators, isLoading, isFetching, isError, error, rootSubRef, curatorAddress, curatorProfile } = useThread(slug, rootSubId)
const { data: board } = useBoardMetadata(slug)
const submissions = useSubmissionsStore()

const replyingTo = ref(null)

// Set of submissionIds currently visible in the curator's tree
const visibleNodeRefs = computed(() =>
  new Set((thread.value?.nodes || []).map((n) => n.submissionId))
)

const rootNode = computed(() =>
  thread.value?.nodes?.find((n) => n.parentSubmissionId === null) || null
)

// Depth-first tree ordering of reply nodes
const replyNodes = computed(() => {
  const nodes = thread.value?.nodes?.filter((n) => n.parentSubmissionId !== null) || []
  if (!nodes.length) return []

  const childrenOf = new Map()
  for (const node of nodes) {
    const pid = node.parentSubmissionId
    if (!childrenOf.has(pid)) childrenOf.set(pid, [])
    childrenOf.get(pid).push(node)
  }

  const rootId = rootNode.value?.submissionId
  if (!rootId) return nodes

  const ordered = []
  const visited = new Set()
  const stack = [...(childrenOf.get(rootId) || [])].reverse()
  while (stack.length) {
    const node = stack.pop()
    ordered.push(node)
    visited.add(node.submissionId)
    const children = childrenOf.get(node.submissionId)
    if (children) {
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push(children[i])
      }
    }
  }

  for (const node of nodes) {
    if (!visited.has(node.submissionId)) ordered.push(node)
  }

  return ordered
})

const rootEntry = computed(() => {
  if (!rootNode.value) return null
  return {
    submissionId: rootNode.value.submissionId,
    submissionRef: rootNode.value.submissionId,
    submission: rootNode.value.submission,
    content: rootNode.value.content,
  }
})

const pendingReplies = computed(() => {
  if (!rootSubRef.value) return []
  const tracked = submissions.pendingForThread(rootSubRef.value)
  return tracked.filter((t) => !visibleNodeRefs.value.has(t.submissionRef))
})

// Track which submission just resolved from pending → visible, for scroll+highlight
const previousPendingRefs = ref(new Set())

watch(pendingReplies, (current, previous) => {
  if (!previous) return
  const currentRefs = new Set(current.map((p) => p.submissionRef))
  const prevRefs = new Set(previous.map((p) => p.submissionRef))

  // Find submissions that just left the pending list (now in curator tree)
  for (const ref of prevRefs) {
    if (!currentRefs.has(ref) && visibleNodeRefs.value.has(ref)) {
      scrollToAndHighlight(ref)
    }
  }
})

function scrollToAndHighlight(submissionId) {
  nextTick(() => {
    const el = document.querySelector(`[data-submission-id="${submissionId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('bg-primary/10')
      setTimeout(() => el.classList.remove('bg-primary/10'), 3000)
    }
  })
}

// Hide top-level PublishProgress once the reply appears in the curator tree
const topLevelReplyVisible = computed(() => {
  if (!topLevelResult.value?.submissionRef) return false
  return visibleNodeRefs.value.has(topLevelResult.value.submissionRef)
})

// Track the top-level form's publish result
const topLevelResult = ref(null)

function onTopLevelPublished(result) {
  topLevelResult.value = result
}

// Auto-refetch when curator picks up any reply in this thread
const curatedCount = computed(() =>
  submissions.pendingForThread(rootSubRef.value)
    .filter((i) => i.status === STATUS.CURATED)
    .length
)

watch(curatedCount, (newCount, oldCount) => {
  if (newCount > oldCount) {
    queryClient.invalidateQueries({ queryKey: ['thread', slug, rootSubId] })
  }
})

function handleReply(node) { replyingTo.value = node }
function cancelReply() { replyingTo.value = null }
function onReplyPublished() { replyingTo.value = null }

function pendingForNode(nodeSubmissionId) {
  return pendingReplies.value.filter((p) => p.parentSubmissionId === nodeSubmissionId)
}
</script>

<template>
  <div class="lg:grid lg:grid-cols-[1fr_18rem] lg:gap-6">
    <div>
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

      <div v-else>
        <PostCard
          v-if="rootEntry"
          :entry="rootEntry"
          :board-slug="slug"
          show-board
          expanded
        />

        <CuratorBar
          v-if="curatorAddress"
          :curator-name="curatorProfile?.name"
          :curator-address="curatorAddress"
          :curators="curators"
          :context="slug"
          class="mt-3"
        />

        <!-- Top-level reply form -->
        <div v-if="rootNode" class="mt-3 mb-4">
          <ReplyForm
            :board-slug="slug"
            :parent-submission-id="rootNode.submissionId"
            :root-submission-id="rootSubRef"
            :show-cancel="false"
            :hide-progress="topLevelReplyVisible"
            @published="onTopLevelPublished"
          />
        </div>

        <!-- Pending replies to root -->
        <template v-if="rootNode">
          <div
            v-for="pending in pendingForNode(rootNode.submissionId)"
            :key="pending.submissionRef"
          >
            <SubmissionStatus
              :status="pending.status"
              :curator-count="pending.curatorPickups.length"
              :is-refreshing="pending.status === STATUS.CURATED && isFetching"
            />
          </div>
        </template>

        <!-- Reply tree (depth-first ordered) -->
        <template v-for="node in replyNodes" :key="node.submissionId">
          <ReplyNode
            :node="node"
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
              :is-refreshing="pending.status === STATUS.CURATED && isFetching"
            />
          </div>
        </template>
      </div>
    </div>

    <div class="hidden lg:block">
      <div class="sticky top-[4.75rem]">
        <BoardSidebar
          :slug="slug"
          :board="board"
          :curator-name="curatorProfile?.name"
        />
      </div>
    </div>
  </div>
</template>
