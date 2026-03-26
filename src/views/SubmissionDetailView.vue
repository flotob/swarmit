<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSubmissionsStore } from '../stores/submissions'
import { fetchObject } from '../swarm/fetch.js'
import { validate } from '../protocol/objects.js'
import { refToHex } from '../protocol/references.js'
import { truncateAddress, timeAgo } from '../lib/format.js'
import { STATUS, STATUS_ICONS, STATUS_LABELS } from '../lib/submission-status.js'
import MarkdownRenderer from '../components/MarkdownRenderer.vue'
import AttachmentGallery from '../components/AttachmentGallery.vue'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'

const route = useRoute()
const router = useRouter()
const store = useSubmissionsStore()

const submissionRef = computed(() => {
  const hex = route.params.submissionRef
  return hex ? `bzz://${hex}` : null
})

const tracked = computed(() =>
  store.items.find((i) => i.submissionRef === submissionRef.value)
)

const content = ref(null)
const contentLoading = ref(true)
const contentError = ref(null)

onMounted(async () => {
  if (!tracked.value?.contentRef) {
    if (submissionRef.value) {
      try {
        const sub = await fetchObject(submissionRef.value)
        const { valid } = validate(sub)
        if (valid && sub.contentRef) {
          const c = await fetchObject(sub.contentRef)
          content.value = c
        }
      } catch (e) {
        contentError.value = e.message
      }
    }
  } else {
    try {
      const c = await fetchObject(tracked.value.contentRef)
      content.value = c
    } catch (e) {
      contentError.value = e.message
    }
  }
  contentLoading.value = false
})

function goToThread() {
  if (!tracked.value) return
  const rootRef = tracked.value.kind === 'post'
    ? tracked.value.submissionRef
    : tracked.value.rootSubmissionId
  const hex = refToHex(rootRef)
  if (hex && tracked.value.boardSlug) {
    router.push({ name: 'thread', params: { slug: tracked.value.boardSlug, rootSubId: hex } })
  }
}

const statusColors = {
  [STATUS.PUBLISHED]: 'bg-secondary border-border text-muted-foreground',
  [STATUS.ANNOUNCED]: 'bg-warning/10 border-warning/30 text-warning',
  [STATUS.WAITING]: 'bg-primary/10 border-primary/30 text-primary',
  [STATUS.CURATED]: 'bg-success/10 border-success/30 text-success',
  [STATUS.SETTLED]: 'bg-secondary border-border text-muted-foreground',
}
</script>

<template>
  <div>
    <Button variant="ghost" size="sm" @click="router.back()" class="mb-4">
      &larr; Back
    </Button>

    <div v-if="!tracked" class="text-center py-16">
      <p class="text-lg mb-2 text-foreground">Submission not found.</p>
      <p class="text-sm text-muted-foreground">This submission isn't in your local activity tracker.</p>
    </div>

    <template v-else>
      <div :class="statusColors[tracked.status]" class="p-4 rounded-lg border mb-6">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-lg">{{ STATUS_ICONS[tracked.status] }}</span>
          <span class="font-medium">{{ STATUS_LABELS[tracked.status] }}</span>
        </div>
        <div class="text-xs opacity-70 mt-1">
          {{ tracked.kind }} in r/{{ tracked.boardSlug }} · {{ timeAgo(tracked.createdAt) }}
        </div>
      </div>

      <div v-if="tracked.curatorPickups.length" class="mb-6">
        <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
          Curator Pickups
        </h3>
        <div class="space-y-1">
          <div
            v-for="pickup in tracked.curatorPickups"
            :key="pickup.curator"
            class="flex items-center gap-2 text-sm text-foreground"
          >
            <span class="text-success">●</span>
            <span>{{ pickup.curatorName || truncateAddress(pickup.curator) }}</span>
            <span class="text-xs text-muted-foreground">{{ timeAgo(pickup.pickedUpAt) }}</span>
          </div>
        </div>
      </div>

      <div v-else-if="tracked.status === STATUS.WAITING" class="mb-6 text-sm text-muted-foreground">
        <p class="animate-pulse">Waiting for curators to pick this up...</p>
        <p class="text-xs mt-1">This usually takes 30–90 seconds after on-chain announcement.</p>
      </div>

      <Alert v-if="tracked.status === STATUS.PUBLISHED" class="mb-6 border-warning/30">
        <AlertDescription>
          This submission was published to Swarm but was not announced on-chain.
          Curators cannot discover it without a chain announcement.
        </AlertDescription>
      </Alert>

      <div v-if="contentLoading" class="space-y-3">
        <Skeleton class="h-6 w-2/3" />
        <Skeleton class="h-20" />
      </div>

      <Alert v-else-if="contentError" variant="destructive">
        <AlertDescription>Failed to load content: {{ contentError }}</AlertDescription>
      </Alert>

      <div v-else-if="content" class="mb-6">
        <h2 v-if="content.title" class="text-xl font-bold text-foreground mb-3">{{ content.title }}</h2>
        <MarkdownRenderer v-if="content.body?.text" :text="content.body.text" />
        <AttachmentGallery
          v-if="content.title && content.attachments?.length"
          :attachments="content.attachments"
          :body-text="content.body?.text || ''"
        />
        <div class="mt-3 text-xs text-muted-foreground">
          by {{ truncateAddress(content.author?.address) }}
        </div>
      </div>

      <div class="mt-8 border-t border-border pt-4 space-y-1 text-xs font-mono text-muted-foreground">
        <div>Submission: {{ tracked.submissionRef }}</div>
        <div v-if="tracked.contentRef">Content: {{ tracked.contentRef }}</div>
        <div v-if="tracked.rootSubmissionId && tracked.kind === 'reply'">Thread root: {{ tracked.rootSubmissionId }}</div>
        <div v-if="tracked.txHash">Tx: {{ tracked.txHash }}</div>
      </div>

      <Button
        v-if="tracked.status === STATUS.CURATED || tracked.status === STATUS.SETTLED"
        @click="goToThread"
        class="mt-4"
      >
        View in thread
      </Button>
    </template>
  </div>
</template>
