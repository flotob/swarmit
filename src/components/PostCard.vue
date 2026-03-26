<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { truncateAddress, timeAgo } from '../lib/format.js'
import { refToHex } from '../protocol/references.js'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Skeleton } from './ui/skeleton'

const props = defineProps({
  entry: Object,
  boardSlug: String,
  showBoard: Boolean,
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
  <Card
    @click="goToThread"
    class="cursor-pointer hover:bg-accent/50 transition-colors"
  >
    <CardContent class="p-4">
      <!-- Loading -->
      <template v-if="!entry.content && !entry.submission">
        <Skeleton class="h-5 w-3/4 mb-2" />
        <Skeleton class="h-3 w-1/2" />
      </template>

      <!-- Content -->
      <template v-else>
        <div v-if="showBoard && boardSlug" class="mb-1.5">
          <router-link
            :to="{ name: 'board', params: { slug: boardSlug } }"
            @click.stop
          >
            <Badge variant="secondary" class="text-xs hover:bg-accent transition-colors">
              r/{{ boardSlug }}
            </Badge>
          </router-link>
        </div>

        <h3 class="text-base font-semibold text-card-foreground mb-1">
          {{ entry.content?.title || '(untitled)' }}
        </h3>

        <p v-if="entry.content?.body?.text" class="text-sm text-muted-foreground mb-2 line-clamp-2">
          {{ entry.content.body.text }}
        </p>

        <div class="flex items-center gap-2 text-xs text-muted-foreground">
          <span v-if="authorAddress">{{ truncateAddress(authorAddress) }}</span>
          <span v-if="createdAt">&middot; {{ timeAgo(createdAt) }}</span>
        </div>
      </template>
    </CardContent>
  </Card>
</template>
