<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { timeAgo, formatLinkDisplay } from '../lib/format.js'
import { displayName } from '../lib/displayName.js'
import { refToHex, bzzToGatewayUrl } from '../protocol/references.js'
import { useVotes } from '../composables/useVotes.js'
import MarkdownRenderer from './MarkdownRenderer.vue'
import AttachmentGallery from './AttachmentGallery.vue'
import CrosspostDialog from './CrosspostDialog.vue'
import { Skeleton } from './ui/skeleton'
import { ChevronUp, ChevronDown, FileText, Link as LinkIcon, Share2, MessageSquare, ExternalLink, Repeat2 } from 'lucide-vue-next'

const props = defineProps({
  entry: Object,
  boardSlug: String,
  showBoard: Boolean,
  rank: Number,
  expanded: Boolean,
})

const router = useRouter()

const submissionRef = computed(() => props.entry.submissionId || props.entry.submissionRef)
const { score, myVote, isVoting, upvote, downvote } = useVotes(submissionRef)

const authorAddress = computed(() => props.entry.content?.author?.address || props.entry.submission?.author?.address)
const createdAt = computed(() => props.entry.submission?.createdAt || props.entry.content?.createdAt)
const isLinkPost = computed(() => !!props.entry.content?.link?.url)

const crosspost = computed(() => props.entry.submission?.metadata?.crosspost || null)
const crossposterAddress = computed(() => props.entry.submission?.author?.address || null)
const crossposterIsOriginalAuthor = computed(() =>
  !!(crossposterAddress.value && authorAddress.value &&
    crossposterAddress.value.toLowerCase() === authorAddress.value.toLowerCase())
)

const showCrosspostDialog = ref(false)
const sourceContentRef = computed(() => props.entry.submission?.contentRef)
const canCrosspost = computed(() =>
  props.entry.submission?.kind === 'post' && !!sourceContentRef.value && !!submissionRef.value && !!props.boardSlug,
)
const hasExpandableContent = computed(() =>
  !!(props.entry.content?.body?.text || props.entry.content?.attachments?.length)
)

const thumbnail = computed(() => {
  const att = props.entry.content?.attachments?.find((a) => a.kind === 'image')
  return att ? bzzToGatewayUrl(att.reference) : null
})

const threadRef = computed(() => refToHex(props.entry.submissionId) || refToHex(props.entry.submissionRef))
const linkDisplay = computed(() => formatLinkDisplay(props.entry.content?.link?.url))

const threadRoute = computed(() => {
  if (!threadRef.value) return null
  return { name: 'thread', params: { slug: props.boardSlug, rootSubId: threadRef.value } }
})

const titleHref = computed(() => {
  if (isLinkPost.value) return props.entry.content.link.url
  return null
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
    <div v-if="rank" class="w-8 shrink-0 text-right pr-1 pt-2 text-sm text-muted-foreground font-medium">
      {{ rank }}
    </div>

    <div class="w-10 shrink-0 flex flex-col items-center gap-0">
      <button
        class="p-0.5 transition-colors"
        :class="myVote === 1 ? 'text-primary' : 'text-muted-foreground/30 hover:text-primary/60'"
        :disabled="isVoting"
        @click="upvote"
      >
        <ChevronUp class="w-5 h-5" />
      </button>
      <span class="text-xs font-medium" :class="myVote === 1 ? 'text-primary' : myVote === -1 ? 'text-destructive' : 'text-muted-foreground/40'">
        {{ score }}
      </span>
      <button
        class="p-0.5 transition-colors"
        :class="myVote === -1 ? 'text-destructive' : 'text-muted-foreground/30 hover:text-destructive/60'"
        :disabled="isVoting"
        @click="downvote"
      >
        <ChevronDown class="w-5 h-5" />
      </button>
    </div>

    <!-- Thumbnail -->
    <router-link v-if="threadRoute" :to="threadRoute" class="w-18 h-14 shrink-0 mr-2 mt-1 rounded overflow-hidden bg-secondary flex items-center justify-center">
      <img v-if="thumbnail" :src="thumbnail" class="w-full h-full object-cover" alt="" />
      <LinkIcon v-else-if="isLinkPost" class="w-6 h-6 text-muted-foreground/30" />
      <FileText v-else class="w-6 h-6 text-muted-foreground/30" />
    </router-link>
    <div v-else class="w-18 h-14 shrink-0 mr-2 mt-1 rounded overflow-hidden bg-secondary flex items-center justify-center">
      <LinkIcon v-if="isLinkPost" class="w-6 h-6 text-muted-foreground/30" />
      <FileText v-else class="w-6 h-6 text-muted-foreground/30" />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0 py-1">
      <template v-if="!entry.content && !entry.submission">
        <Skeleton class="h-4 w-3/4 mb-2" />
        <Skeleton class="h-3 w-1/2" />
      </template>

      <template v-else>
        <!-- Title -->
        <a
          v-if="titleHref"
          :href="titleHref"
          target="_blank"
          rel="noopener"
          class="text-link hover:underline font-medium leading-snug"
        >
          {{ entry.content?.title || '(untitled)' }}
        </a>
        <router-link v-else-if="threadRoute" :to="threadRoute" class="text-link hover:underline font-medium leading-snug">
          {{ entry.content?.title || '(untitled)' }}
        </router-link>
        <span v-else class="text-link font-medium leading-snug">
          {{ entry.content?.title || '(untitled)' }}
        </span>

        <!-- Domain / self indicator -->
        <a
          v-if="entry.content?.link?.url"
          :href="entry.content.link.url"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center gap-0.5 ml-1.5 text-xs text-muted-foreground hover:text-link"
        >
          ({{ linkDisplay }})
          <ExternalLink class="w-3 h-3" />
        </a>
        <router-link
          v-else-if="threadRoute && boardSlug"
          :to="threadRoute"
          class="ml-1.5 text-xs text-muted-foreground hover:text-link"
        >
          (self.{{ boardSlug }})
        </router-link>

        <!-- Meta line -->
        <div class="text-xs text-muted-foreground mt-0.5">
          submitted {{ createdAt ? timeAgo(createdAt) : '' }}
          <template v-if="authorAddress">
            by
            <router-link :to="`/u/${authorAddress}`" class="hover:underline">
              {{ displayName(authorAddress) }}
            </router-link>
          </template>
          <template v-if="showBoard && boardSlug">
            to
            <router-link :to="{ name: 'board', params: { slug: boardSlug } }" class="hover:underline font-medium">
              r/{{ boardSlug }}
            </router-link>
          </template>
        </div>

        <!-- Crosspost provenance -->
        <div v-if="crosspost" class="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
          <Repeat2 class="w-3 h-3" />
          crossposted from
          <router-link :to="{ name: 'board', params: { slug: crosspost.fromBoard } }" class="hover:underline font-medium">
            r/{{ crosspost.fromBoard }}
          </router-link>
          <template v-if="crossposterAddress && !crossposterIsOriginalAuthor">
            by
            <router-link :to="`/u/${crossposterAddress}`" class="hover:underline">
              {{ displayName(crossposterAddress) }}
            </router-link>
          </template>
        </div>

        <!-- Expanded content (thread view only) -->
        <div v-if="expanded && hasExpandableContent" class="mt-3 mb-2 p-4 rounded-md bg-secondary/50 max-w-3xl">
          <a
            v-if="entry.content.link?.url"
            :href="entry.content.link.url"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-1 text-sm text-link hover:underline mb-2"
          >
            {{ entry.content.link.url }}
            <ExternalLink class="w-3.5 h-3.5" />
          </a>

          <MarkdownRenderer
            v-if="entry.content.body?.text"
            :text="entry.content.body.text"
          />

          <AttachmentGallery
            v-if="entry.content.attachments?.length"
            :attachments="entry.content.attachments"
            :body-text="entry.content.body?.text || ''"
          />
        </div>

        <!-- Action line -->
        <div class="flex items-center gap-3 mt-1 text-xs text-muted-foreground font-medium">
          <router-link v-if="threadRoute" :to="threadRoute" class="hover:underline flex items-center gap-1">
            <MessageSquare class="w-3 h-3" />
            {{ isLinkPost ? 'comments' : 'discuss' }}
          </router-link>
          <button @click="share" class="hover:underline flex items-center gap-1">
            <Share2 class="w-3 h-3" />
            share
          </button>
          <button
            v-if="canCrosspost"
            class="hover:underline flex items-center gap-1"
            @click="showCrosspostDialog = true"
          >
            <Repeat2 class="w-3 h-3" />
            crosspost
          </button>
        </div>
      </template>
    </div>

    <CrosspostDialog
      v-if="showCrosspostDialog"
      v-model:open="showCrosspostDialog"
      :source-board-slug="boardSlug"
      :source-submission-ref="submissionRef"
      :content-ref="sourceContentRef"
    />
  </div>
</template>
