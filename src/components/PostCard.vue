<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { truncateAddress, timeAgo } from '../lib/format.js'
import { refToHex, bzzToGatewayUrl } from '../protocol/references.js'
import { Skeleton } from './ui/skeleton'
import { ChevronUp, ChevronDown, FileText, Share2, MessageSquare, ExternalLink } from 'lucide-vue-next'

const props = defineProps({
  entry: Object,
  boardSlug: String,
  showBoard: Boolean,
  rank: Number,
})

const router = useRouter()

const authorAddress = computed(() => props.entry.content?.author?.address || props.entry.submission?.author?.address)
const createdAt = computed(() => props.entry.submission?.createdAt || props.entry.content?.createdAt)

const thumbnail = computed(() => {
  const att = props.entry.content?.attachments?.find((a) => a.kind === 'image')
  return att ? bzzToGatewayUrl(att.reference) : null
})

const threadRef = computed(() => refToHex(props.entry.submissionId) || refToHex(props.entry.submissionRef))

const linkHostname = computed(() => {
  const url = props.entry.content?.link?.url
  if (!url) return null
  try { return new URL(url).hostname } catch { return url }
})

const threadRoute = computed(() => {
  if (!threadRef.value) return null
  return { name: 'thread', params: { slug: props.boardSlug, rootSubId: threadRef.value } }
})

function share() {
  if (threadRef.value) {
    const resolved = router.resolve(threadRoute.value)
    const url = `${window.location.origin}${window.location.pathname}${resolved.href}`
    navigator.clipboard?.writeText(url)
  }
}
</script>

<template>
  <div class="flex items-start gap-0 py-2 hover:bg-accent/30 transition-colors">
    <!-- Rank (vertically centered via items-center on parent) -->
    <div v-if="rank" class="w-8 shrink-0 text-right pr-1 pt-2 text-sm text-muted-foreground font-medium">
      {{ rank }}
    </div>

    <!-- Vote placeholder -->
    <div class="w-10 shrink-0 flex flex-col items-center gap-0">
      <button class="text-muted-foreground/30 cursor-not-allowed p-0.5" title="Voting coming soon">
        <ChevronUp class="w-5 h-5" />
      </button>
      <span class="text-xs text-muted-foreground/40 font-medium">&mdash;</span>
      <button class="text-muted-foreground/30 cursor-not-allowed p-0.5" title="Voting coming soon">
        <ChevronDown class="w-5 h-5" />
      </button>
    </div>

    <!-- Thumbnail -->
    <router-link v-if="threadRoute" :to="threadRoute" class="w-18 h-14 shrink-0 mr-2 mt-1 rounded overflow-hidden bg-secondary flex items-center justify-center">
      <img v-if="thumbnail" :src="thumbnail" class="w-full h-full object-cover" alt="" />
      <FileText v-else class="w-6 h-6 text-muted-foreground/30" />
    </router-link>
    <div v-else class="w-18 h-14 shrink-0 mr-2 mt-1 rounded overflow-hidden bg-secondary flex items-center justify-center">
      <FileText class="w-6 h-6 text-muted-foreground/30" />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0 py-1">
      <template v-if="!entry.content && !entry.submission">
        <Skeleton class="h-4 w-3/4 mb-2" />
        <Skeleton class="h-3 w-1/2" />
      </template>

      <template v-else>
        <router-link v-if="threadRoute" :to="threadRoute" class="text-link hover:underline font-medium leading-snug">
          {{ entry.content?.title || '(untitled)' }}
        </router-link>
        <span v-else class="text-link font-medium leading-snug">
          {{ entry.content?.title || '(untitled)' }}
        </span>
        <a
          v-if="entry.content?.link?.url"
          :href="entry.content.link.url"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center gap-0.5 ml-1.5 text-xs text-muted-foreground hover:text-link"
        >
          ({{ linkHostname }})
          <ExternalLink class="w-3 h-3" />
        </a>

        <div class="text-xs text-muted-foreground mt-0.5">
          submitted {{ createdAt ? timeAgo(createdAt) : '' }}
          <template v-if="authorAddress">
            by
            <router-link :to="`/u/${authorAddress}`" class="hover:underline">
              {{ truncateAddress(authorAddress) }}
            </router-link>
          </template>
          <template v-if="showBoard && boardSlug">
            to
            <router-link :to="{ name: 'board', params: { slug: boardSlug } }" class="hover:underline font-medium">
              r/{{ boardSlug }}
            </router-link>
          </template>
        </div>

        <div class="flex items-center gap-3 mt-1 text-xs text-muted-foreground font-medium">
          <router-link v-if="threadRoute" :to="threadRoute" class="hover:underline flex items-center gap-1">
            <MessageSquare class="w-3 h-3" />
            discuss
          </router-link>
          <button @click="share" class="hover:underline flex items-center gap-1">
            <Share2 class="w-3 h-3" />
            share
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
