<script setup>
import { truncateAddress, timeAgo, threadIndent } from '../lib/format.js'
import MarkdownRenderer from './MarkdownRenderer.vue'
import { Button } from './ui/button'
import { MessageSquare } from 'lucide-vue-next'

defineProps({
  node: Object,
})

defineEmits(['reply'])
</script>

<template>
  <div
    :style="{ marginLeft: threadIndent(node.depth) }"
    class="py-3 border-b border-border"
  >
    <div class="flex items-center gap-2 text-xs text-muted-foreground mb-1">
      <router-link
        v-if="node.content?.author?.address"
        :to="`/u/${node.content.author.address}`"
        class="hover:text-foreground transition-colors"
      >
        {{ truncateAddress(node.content?.author?.address || node.submission?.author?.address) }}
      </router-link>
      <span v-if="node.submission?.createdAt || node.content?.createdAt">
        · {{ timeAgo(node.submission?.createdAt || node.content?.createdAt) }}
      </span>
    </div>

    <MarkdownRenderer
      v-if="node.content?.body?.text"
      :text="node.content.body.text"
    />

    <div v-else-if="!node.content" class="text-sm text-muted-foreground italic">
      Content unavailable
    </div>

    <Button
      variant="ghost"
      size="sm"
      class="mt-2 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
      @click="$emit('reply', node)"
    >
      <MessageSquare class="w-3.5 h-3.5 mr-1" />
      Reply
    </Button>
  </div>
</template>
