<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useThread } from '../composables/useThread'
import { useBoardMetadata } from '../composables/useBoard'
import { useSubmissionsStore } from '../stores/submissions'
import { threadIndent } from '../lib/format.js'
import PostCard from '../components/PostCard.vue'
import MarkdownRenderer from '../components/MarkdownRenderer.vue'
import AttachmentGallery from '../components/AttachmentGallery.vue'
import ReplyNode from '../components/ReplyNode.vue'
import ReplyForm from '../components/ReplyForm.vue'
import CuratorBar from '../components/CuratorBar.vue'
import BoardSidebar from '../components/BoardSidebar.vue'
import SubmissionStatus from '../components/SubmissionStatus.vue'
import { Skeleton } from '../components/ui/skeleton'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { ExternalLink } from 'lucide-vue-next'

const route = useRoute()
const slug = computed(() => route.params.slug)
const rootSubId = computed(() => route.params.rootSubId)

const { thread, curators, isLoading, isError, error, rootSubRef, curatorAddress, curatorProfile } = useThread(slug, rootSubId)
const { data: board } = useBoardMetadata(slug)
const submissions = useSubmissionsStore()

const replyingTo = ref(null)

const rootNode = computed(() =>
  thread.value?.nodes?.find((n) => n.parentSubmissionId === null) || null
)

const replyNodes = computed(() =>
  thread.value?.nodes?.filter((n) => n.parentSubmissionId !== null) || []
)

// Build a PostCard-compatible entry from the root node
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
  const curatorNodeRefs = new Set(
    (thread.value?.nodes || []).map((n) => n.submissionId)
  )
  return tracked.filter((t) => !curatorNodeRefs.has(t.submissionRef))
})

function handleReply(node) { replyingTo.value = node }
function cancelReply() { replyingTo.value = null }
function onReplyPublished() { replyingTo.value = null }

function replyToRoot() { if (rootNode.value) replyingTo.value = rootNode.value }

function pendingForNode(nodeSubmissionId) {
  return pendingReplies.value.filter((p) => p.parentSubmissionId === nodeSubmissionId)
}
</script>

<template>
  <div class="lg:grid lg:grid-cols-[1fr_18rem] lg:gap-6">
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
        <!-- Root post as PostCard (same as feed/board) -->
        <PostCard
          v-if="rootEntry"
          :entry="rootEntry"
          :board-slug="slug"
          show-board
        />

        <!-- Expanded root content: body, link, attachments -->
        <div v-if="rootNode?.content" class="py-4 border-b border-border">
          <a
            v-if="rootNode.content.link?.url"
            :href="rootNode.content.link.url"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-1 text-sm text-link hover:underline mb-3"
          >
            {{ rootNode.content.link.url }}
            <ExternalLink class="w-3.5 h-3.5" />
          </a>

          <MarkdownRenderer
            v-if="rootNode.content.body?.text"
            :text="rootNode.content.body.text"
          />

          <AttachmentGallery
            v-if="rootNode.content.title && rootNode.content.attachments?.length"
            :attachments="rootNode.content.attachments"
            :body-text="rootNode.content.body?.text || ''"
          />

          <div class="mt-3">
            <Button variant="ghost" size="sm" @click="replyToRoot" class="text-xs text-muted-foreground">
              reply
            </Button>
          </div>
        </div>

        <!-- Reply form for root -->
        <div v-if="rootNode && replyingTo?.submissionId === rootNode.submissionId" class="mt-2">
          <ReplyForm
            :board-slug="slug"
            :parent-submission-id="rootNode.submissionId"
            :root-submission-id="rootSubRef"
            @published="onReplyPublished"
            @cancel="cancelReply"
          />
        </div>

        <!-- Pending replies to root -->
        <div
          v-for="pending in pendingForNode(rootNode?.submissionId)"
          :key="pending.submissionRef"
        >
          <SubmissionStatus
            :status="pending.status"
            :curator-count="pending.curatorPickups.length"
          />
        </div>

        <!-- Reply tree (non-root nodes only) -->
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
