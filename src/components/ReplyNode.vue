<script setup>
import { truncateAddress, timeAgo, threadIndent } from '../lib/format.js'
import MarkdownRenderer from './MarkdownRenderer.vue'
import AttachmentGallery from './AttachmentGallery.vue'

defineProps({
  node: Object,        // { submissionId, parentSubmissionId, depth, submission, content }
  isRoot: Boolean,
})

defineEmits(['reply'])
</script>

<template>
  <div
    :style="{ marginLeft: threadIndent(node.depth) }"
    class="py-3 border-b border-gray-800"
  >
    <!-- Header -->
    <div class="flex items-center gap-2 text-xs text-gray-500 mb-1">
      <router-link
        v-if="node.content?.author?.address"
        :to="`/u/${node.content.author.address}`"
        class="hover:text-gray-300"
      >
        {{ truncateAddress(node.content?.author?.address || node.submission?.author?.address) }}
      </router-link>
      <span v-if="node.submission?.createdAt || node.content?.createdAt">
        · {{ timeAgo(node.submission?.createdAt || node.content?.createdAt) }}
      </span>
    </div>

    <!-- Title (root post only) -->
    <h2 v-if="isRoot && node.content?.title" class="text-xl font-bold mb-2">
      {{ node.content.title }}
    </h2>

    <!-- Body -->
    <MarkdownRenderer
      v-if="node.content?.body?.text"
      :text="node.content.body.text"
    />

    <!-- Attachment fallback: images not embedded in markdown -->
    <AttachmentGallery
      v-if="node.content?.attachments?.length"
      :attachments="node.content.attachments"
      :body-text="node.content.body?.text || ''"
    />

    <!-- Failed to load -->
    <div v-else-if="!node.content" class="text-sm text-gray-600 italic">
      Content unavailable
    </div>

    <!-- Reply button -->
    <button
      class="mt-2 text-xs text-gray-500 hover:text-orange-400 transition-colors"
      @click="$emit('reply', node)"
    >
      Reply
    </button>
  </div>
</template>
