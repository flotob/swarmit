<script setup>
import { computed } from 'vue'
import { timeAgo, PX_PER_DEPTH, MAX_THREAD_DEPTH } from '../lib/format.js'
import { displayName } from '../lib/displayName.js'
import { useVotes } from '../composables/useVotes.js'
import MarkdownRenderer from './MarkdownRenderer.vue'
import { ChevronUp, ChevronDown, MessageSquare } from 'lucide-vue-next'

const props = defineProps({
  node: Object,
  collapsed: Boolean,
  childCount: { type: Number, default: 0 },
})

defineEmits(['reply', 'toggle-collapse'])

const { score, myVote, isVoting, upvote, downvote } = useVotes(computed(() => props.node.submissionId))

const lineCount = computed(() => Math.max(0, Math.min(props.node.depth || 0, MAX_THREAD_DEPTH) - 1))
</script>

<template>
  <div
    :data-submission-id="node.submissionId"
    class="flex transition-colors duration-1000"
  >
    <div
      v-for="d in lineCount"
      :key="d"
      class="shrink-0 relative"
      :style="{ width: PX_PER_DEPTH + 'px' }"
    >
      <div class="absolute left-3 top-0 bottom-0 w-px bg-border" />
    </div>

    <div class="w-6 shrink-0 flex flex-col items-center pt-1.5">
      <button
        class="p-0 transition-colors"
        :class="myVote === 1 ? 'text-primary' : 'text-muted-foreground/30 hover:text-primary/60'"
        :disabled="isVoting"
        @click="upvote"
      >
        <ChevronUp class="w-4 h-4" />
      </button>
      <button
        class="p-0 transition-colors"
        :class="myVote === -1 ? 'text-destructive' : 'text-muted-foreground/30 hover:text-destructive/60'"
        :disabled="isVoting"
        @click="downvote"
      >
        <ChevronDown class="w-4 h-4" />
      </button>
    </div>

    <div class="flex-1 min-w-0 py-2 pl-1">
      <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
        <button
          @click="$emit('toggle-collapse', node.submissionId)"
          class="hover:text-foreground font-mono text-[11px] cursor-pointer transition-colors"
        >
          [{{ collapsed ? '+' : '−' }}]
        </button>

        <router-link
          v-if="node.content?.author?.address"
          :to="`/u/${node.content.author.address}`"
          class="font-medium hover:underline"
        >
          {{ displayName(node.content.author.address) }}
        </router-link>

        <span>·</span>
        <span :class="myVote === 1 ? 'text-primary' : myVote === -1 ? 'text-destructive' : 'text-muted-foreground/50'">{{ score }} {{ Math.abs(score) === 1 ? 'point' : 'points' }}</span>

        <template v-if="node.submission?.createdAt || node.content?.createdAt">
          <span>·</span>
          <span>{{ timeAgo(node.submission?.createdAt || node.content?.createdAt) }}</span>
        </template>

        <template v-if="collapsed && childCount > 0">
          <span class="italic text-muted-foreground/50">({{ childCount }} {{ childCount === 1 ? 'child' : 'children' }})</span>
        </template>
      </div>

      <template v-if="!collapsed">
        <MarkdownRenderer
          v-if="node.content?.body?.text"
          :text="node.content.body.text"
          class="mt-1"
        />

        <div v-else-if="!node.content" class="text-sm text-muted-foreground italic mt-1">
          Content unavailable
        </div>

        <div class="flex items-center gap-3 mt-1 text-xs text-muted-foreground font-medium">
          <button
            class="hover:underline flex items-center gap-1 cursor-pointer"
            @click="$emit('reply', node)"
          >
            <MessageSquare class="w-3 h-3" />
            reply
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
