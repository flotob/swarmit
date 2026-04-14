<script setup>
import { computed, reactive, ref, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import { useThread } from '../composables/useThread'
import { useBoardMetadata } from '../composables/useBoard'
import { useSubmissionsStore } from '../stores/submissions'
import { useAuthStore } from '../stores/auth'
import { STATUS } from '../lib/submission-status.js'
import { PX_PER_DEPTH, MAX_THREAD_DEPTH } from '../lib/format.js'
import PostCard from '../components/PostCard.vue'
import ReplyNode from '../components/ReplyNode.vue'
import ReplyForm from '../components/ReplyForm.vue'
import CuratorBar from '../components/CuratorBar.vue'
import BoardSidebar from '../components/BoardSidebar.vue'
import { Skeleton } from '../components/ui/skeleton'
import { Alert, AlertDescription } from '../components/ui/alert'

const route = useRoute()
const queryClient = useQueryClient()
const slug = computed(() => route.params.slug)
const rootSubId = computed(() => route.params.rootSubId)

const { thread, curators, isLoading, isFetching, isError, error, rootSubRef, curatorAddress, curatorProfile } = useThread(slug, rootSubId)
const { data: board } = useBoardMetadata(slug)
const submissions = useSubmissionsStore()
const auth = useAuthStore()

const replyingTo = ref(null)

const visibleNodeRefs = computed(() =>
  new Set((thread.value?.nodes || []).map((n) => n.submissionId))
)

const rootNode = computed(() =>
  thread.value?.nodes?.find((n) => n.parentSubmissionId === null) || null
)

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

const collapsedNodes = reactive(new Set())

const visibleReplyNodes = computed(() => {
  const result = []
  let skipUntilDepth = Infinity

  for (const node of replyNodes.value) {
    if (node.depth > skipUntilDepth) continue
    skipUntilDepth = Infinity

    result.push(node)

    if (collapsedNodes.has(node.submissionId)) {
      skipUntilDepth = node.depth
    }
  }

  return result
})

const childrenCounts = computed(() => {
  const counts = new Map()
  const nodes = replyNodes.value
  for (let i = nodes.length - 1; i >= 0; i--) {
    let count = 0
    for (let j = i + 1; j < nodes.length && nodes[j].depth > nodes[i].depth;) {
      const childCount = counts.get(nodes[j].submissionId) || 0
      count += 1 + childCount
      j += 1 + childCount
    }
    counts.set(nodes[i].submissionId, count)
  }
  return counts
})

function toggleCollapse(submissionId) {
  if (collapsedNodes.has(submissionId)) {
    collapsedNodes.delete(submissionId)
  } else {
    collapsedNodes.add(submissionId)
  }
}

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
  const tracked = submissions.pendingForThread(rootSubRef.value, auth.userAddress)
  return tracked.filter((t) => !visibleNodeRefs.value.has(t.submissionRef))
})

watch(pendingReplies, (current, previous) => {
  if (!previous) return
  const currentRefs = new Set(current.map((p) => p.submissionRef))
  const prevRefs = new Set(previous.map((p) => p.submissionRef))

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
      el.classList.add('reply-highlight')
      setTimeout(() => el.classList.remove('reply-highlight'), 3000)
    }
  })
}

const commentTarget = computed(() => {
  const hex = route.query.comment
  return hex ? `bzz://${hex}` : null
})
watch(
  () => !isLoading.value && commentTarget.value,
  (ready) => {
    if (ready) scrollToAndHighlight(commentTarget.value)
  },
  { immediate: true },
)

const topLevelResult = ref(null)
const inlineResult = ref(null)

const topLevelReplyVisible = computed(() => {
  if (!topLevelResult.value?.submissionRef) return false
  return visibleNodeRefs.value.has(topLevelResult.value.submissionRef)
})

const inlineReplyVisible = computed(() => {
  if (!inlineResult.value?.submissionRef) return false
  return visibleNodeRefs.value.has(inlineResult.value.submissionRef)
})

watch(inlineReplyVisible, (visible) => {
  if (visible) {
    replyingTo.value = null
    inlineResult.value = null
  }
})

function onTopLevelPublished(result) {
  topLevelResult.value = result
}

function onInlinePublished(result) {
  inlineResult.value = result
  // Don't set replyingTo = null — keep form mounted for progress display
}

// Auto-refetch when curator picks up any reply in this thread
const curatedCount = computed(() =>
  submissions.pendingForThread(rootSubRef.value, auth.userAddress)
    .filter((i) => i.status === STATUS.CURATED)
    .length
)

watch(curatedCount, (newCount, oldCount) => {
  if (newCount > oldCount) {
    queryClient.invalidateQueries({ queryKey: ['thread', slug, rootSubId] })
  }
})

function handleReply(node) {
  inlineResult.value = null
  replyingTo.value = node
}
function cancelReply() { replyingTo.value = null }

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

        <div v-if="rootNode" class="mt-3 mb-4">
          <ReplyForm
            :board-slug="slug"
            :parent-submission-id="rootNode.submissionId"
            :root-submission-id="rootSubRef"
            :show-cancel="false"
            :hide-progress="topLevelReplyVisible"
            :is-fetching="isFetching"
            @submitting="topLevelResult = null"
            @published="onTopLevelPublished"
          />
        </div>

        <template v-for="node in visibleReplyNodes" :key="node.submissionId">
          <ReplyNode
            :node="node"
            :collapsed="collapsedNodes.has(node.submissionId)"
            :child-count="childrenCounts.get(node.submissionId) || 0"
            @reply="handleReply"
            @toggle-collapse="toggleCollapse"
          />

          <div
            v-if="replyingTo?.submissionId === node.submissionId && !collapsedNodes.has(node.submissionId)"
            class="flex"
          >
            <div
              v-for="d in Math.min(node.depth || 0, MAX_THREAD_DEPTH)"
              :key="d"
              class="shrink-0 relative"
              :style="{ width: PX_PER_DEPTH + 'px' }"
            >
              <div class="absolute left-3 top-0 bottom-0 w-px bg-border" />
            </div>
            <div class="flex-1 min-w-0 pl-7">
              <ReplyForm
                :board-slug="slug"
                :parent-submission-id="node.submissionId"
                :root-submission-id="rootSubRef"
                :hide-progress="inlineReplyVisible"
                :is-fetching="isFetching"
                @submitting="inlineResult = null"
                @published="onInlinePublished"
                @cancel="cancelReply"
              />
            </div>
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

<style>
.reply-highlight {
  background-color: var(--primary) !important;
  background-color: color-mix(in oklch, var(--primary) 10%, transparent) !important;
}
</style>
