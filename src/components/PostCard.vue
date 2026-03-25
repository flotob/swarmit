<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { truncateAddress, timeAgo } from '../lib/format.js'
import { refToHex } from '../protocol/references.js'

const props = defineProps({
  entry: Object,       // { submissionId, submissionRef, submission, content, threadIndexFeed }
  boardSlug: String,
})

const router = useRouter()

const authorAddress = computed(() => props.entry.content?.author?.address || props.entry.submission?.author?.address)
const createdAt = computed(() => props.entry.submission?.createdAt || props.entry.content?.createdAt)

function goToThread() {
  const ref = refToHex(props.entry.submissionId) || refToHex(props.entry.submissionRef)
  if (ref) {
    router.push({ name: 'thread', params: { slug: props.boardSlug, rootSubId: ref } })
  }
}
</script>

<template>
  <div
    @click="goToThread"
    class="p-4 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 cursor-pointer transition-colors"
  >
    <!-- Loading (content not yet resolved) -->
    <template v-if="!entry.content && !entry.submission">
      <div class="h-5 w-3/4 bg-gray-800 rounded animate-pulse mb-2" />
      <div class="h-3 w-1/2 bg-gray-800 rounded animate-pulse" />
    </template>

    <!-- Content -->
    <template v-else>
      <h3 class="text-base font-semibold text-gray-100 mb-1">
        {{ entry.content?.title || '(untitled)' }}
      </h3>
      <p v-if="entry.content?.body?.text" class="text-sm text-gray-400 mb-2 line-clamp-2">
        {{ entry.content.body.text }}
      </p>
      <div class="flex items-center gap-2 text-xs text-gray-500">
        <span v-if="authorAddress">{{ truncateAddress(authorAddress) }}</span>
        <span v-if="createdAt">&middot; {{ timeAgo(createdAt) }}</span>
      </div>
    </template>
  </div>
</template>
