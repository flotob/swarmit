<script setup>
import { useRouter } from 'vue-router'
import { truncateAddress, timeAgo } from '../lib/format.js'
import { fetchObject } from '../swarm/fetch.js'
import { ref, onMounted } from 'vue'

const props = defineProps({
  entry: Object,       // boardIndex entry { submissionId, submissionRef, threadIndexFeed }
  boardSlug: String,
})

const router = useRouter()
const submission = ref(null)
const content = ref(null)
const loadError = ref(false)

onMounted(async () => {
  try {
    submission.value = await fetchObject(props.entry.submissionRef)
    if (submission.value?.contentRef) {
      content.value = await fetchObject(submission.value.contentRef)
    }
  } catch {
    loadError.value = true
  }
})

function goToThread() {
  const ref = props.entry.submissionId?.replace('bzz://', '') || props.entry.submissionRef?.replace('bzz://', '')
  if (ref) {
    router.push({ name: 'thread', params: { slug: props.boardSlug, rootSubId: ref } })
  }
}

const authorAddress = () => content.value?.author?.address || submission.value?.author?.address
const createdAt = () => submission.value?.createdAt || content.value?.createdAt
</script>

<template>
  <div
    @click="goToThread"
    class="p-4 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 cursor-pointer transition-colors"
  >
    <!-- Loading skeleton -->
    <template v-if="!content && !loadError">
      <div class="h-5 w-3/4 bg-gray-800 rounded animate-pulse mb-2" />
      <div class="h-3 w-1/2 bg-gray-800 rounded animate-pulse" />
    </template>

    <!-- Error -->
    <div v-else-if="loadError" class="text-sm text-red-500">
      Failed to load post
    </div>

    <!-- Content -->
    <template v-else>
      <h3 class="text-base font-semibold text-gray-100 mb-1">
        {{ content?.title || '(untitled)' }}
      </h3>
      <p v-if="content?.body?.text" class="text-sm text-gray-400 mb-2 line-clamp-2">
        {{ content.body.text }}
      </p>
      <div class="flex items-center gap-2 text-xs text-gray-500">
        <span v-if="authorAddress()">{{ truncateAddress(authorAddress()) }}</span>
        <span v-if="createdAt()">· {{ timeAgo(createdAt()) }}</span>
      </div>
    </template>
  </div>
</template>
