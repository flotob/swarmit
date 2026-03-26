<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSubmissionsStore } from '../stores/submissions'
import { fetchObject } from '../swarm/fetch.js'
import { validate } from '../protocol/objects.js'
import { refToHex } from '../protocol/references.js'
import { truncateAddress, timeAgo } from '../lib/format.js'
import { STATUS, STATUS_ICONS, STATUS_LABELS } from '../lib/submission-status.js'
import MarkdownRenderer from '../components/MarkdownRenderer.vue'
import AttachmentGallery from '../components/AttachmentGallery.vue'
import { ref } from 'vue'

const route = useRoute()
const router = useRouter()
const store = useSubmissionsStore()

const submissionRef = computed(() => {
  const hex = route.params.submissionRef
  return hex ? `bzz://${hex}` : null
})

// Find in local tracker
const tracked = computed(() =>
  store.items.find((i) => i.submissionRef === submissionRef.value)
)

// Fetch the actual content from Swarm
const content = ref(null)
const contentLoading = ref(true)
const contentError = ref(null)

onMounted(async () => {
  if (!tracked.value?.contentRef) {
    // Try fetching the submission object to find contentRef
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
  [STATUS.PUBLISHED]: 'bg-gray-800 border-gray-700 text-gray-400',
  [STATUS.ANNOUNCED]: 'bg-yellow-900/20 border-yellow-800 text-yellow-500',
  [STATUS.WAITING]: 'bg-orange-900/20 border-orange-800 text-orange-400',
  [STATUS.CURATED]: 'bg-green-900/20 border-green-800 text-green-500',
  [STATUS.SETTLED]: 'bg-gray-800 border-gray-700 text-gray-500',
}
</script>

<template>
  <div>
    <button @click="router.back()" class="text-sm text-gray-500 hover:text-gray-300 mb-4 inline-block">
      &larr; Back
    </button>

    <!-- Not found in tracker -->
    <div v-if="!tracked" class="text-center py-16 text-gray-500">
      <p class="text-lg mb-2">Submission not found.</p>
      <p class="text-sm">This submission isn't in your local activity tracker.</p>
    </div>

    <template v-else>
      <!-- Status banner -->
      <div :class="statusColors[tracked.status]" class="p-4 rounded-lg border mb-6">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-lg">{{ STATUS_ICONS[tracked.status] }}</span>
          <span class="font-medium">{{ STATUS_LABELS[tracked.status] }}</span>
        </div>
        <div class="text-xs opacity-70 mt-1">
          {{ tracked.kind }} in r/{{ tracked.boardSlug }} · {{ timeAgo(tracked.createdAt) }}
        </div>
      </div>

      <!-- Curator pickups -->
      <div v-if="tracked.curatorPickups.length" class="mb-6">
        <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Curator Pickups
        </h3>
        <div class="space-y-1">
          <div
            v-for="pickup in tracked.curatorPickups"
            :key="pickup.curator"
            class="flex items-center gap-2 text-sm text-gray-300"
          >
            <span class="text-green-500">●</span>
            <span>{{ pickup.curatorName || truncateAddress(pickup.curator) }}</span>
            <span class="text-xs text-gray-600">{{ timeAgo(pickup.pickedUpAt) }}</span>
          </div>
        </div>
      </div>

      <!-- No pickups yet -->
      <div v-else-if="tracked.status === STATUS.WAITING" class="mb-6 text-sm text-gray-500">
        <p class="animate-pulse">Waiting for curators to pick this up...</p>
        <p class="text-xs mt-1">This usually takes 30–90 seconds after on-chain announcement.</p>
      </div>

      <!-- Not announced warning -->
      <div v-if="tracked.status === STATUS.PUBLISHED" class="mb-6 p-3 rounded-md bg-yellow-900/10 border border-yellow-800/30 text-sm text-yellow-500/80">
        This submission was published to Swarm but was not announced on-chain.
        Curators cannot discover it without a chain announcement.
        <!-- TODO: Add "Retry announcement" button here -->
      </div>

      <!-- Content -->
      <div v-if="contentLoading" class="space-y-3">
        <div class="h-6 w-2/3 bg-gray-800 rounded animate-pulse" />
        <div class="h-20 bg-gray-800 rounded animate-pulse" />
      </div>

      <div v-else-if="contentError" class="p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-400 text-sm">
        Failed to load content: {{ contentError }}
      </div>

      <div v-else-if="content" class="mb-6">
        <h2 v-if="content.title" class="text-xl font-bold mb-3">{{ content.title }}</h2>
        <MarkdownRenderer v-if="content.body?.text" :text="content.body.text" />
        <AttachmentGallery
          v-if="content.attachments?.length"
          :attachments="content.attachments"
          :body-text="content.body?.text || ''"
        />
        <div class="mt-3 text-xs text-gray-600">
          by {{ truncateAddress(content.author?.address) }}
        </div>
      </div>

      <!-- Metadata -->
      <div class="mt-8 border-t border-gray-800 pt-4 space-y-1 text-xs font-mono text-gray-600">
        <div>Submission: {{ tracked.submissionRef }}</div>
        <div v-if="tracked.contentRef">Content: {{ tracked.contentRef }}</div>
        <div v-if="tracked.rootSubmissionId && tracked.kind === 'reply'">Thread root: {{ tracked.rootSubmissionId }}</div>
        <div v-if="tracked.txHash">Tx: {{ tracked.txHash }}</div>
      </div>

      <!-- Navigate to thread -->
      <button
        v-if="tracked.status === STATUS.CURATED || tracked.status === STATUS.SETTLED"
        @click="goToThread"
        class="mt-4 px-4 py-2 text-sm font-medium rounded-md bg-orange-500 text-white hover:bg-orange-600 transition-colors"
      >
        View in thread
      </button>
    </template>
  </div>
</template>
