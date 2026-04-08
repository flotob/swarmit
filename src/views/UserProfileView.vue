<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { useAuthStore } from '../stores/auth'
import { displayName, timeAgo } from '../lib/format.js'
import { refToHex } from '../protocol/references.js'
import { validate } from '../protocol/objects.js'
import { resolveFeed } from '../swarm/feeds.js'
import { fetchObject } from '../swarm/fetch.js'
import { getBoardRegistrations, getSubmissionsForBoard } from '../chain/events.js'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
import { Alert, AlertDescription } from '../components/ui/alert'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const address = computed(() => route.params.address)

const { data: profile, isLoading, isError, error } = useQuery({
  queryKey: ['userProfile', address],
  queryFn: async () => {
    const addr = address.value

    let userFeedRef = null
    if (auth.userAddress?.toLowerCase() === addr.toLowerCase() && auth.userFeed) {
      userFeedRef = auth.userFeed
    }

    if (!userFeedRef) {
      const regs = await getBoardRegistrations()
      const results = await Promise.all(
        regs.map(async (reg) => {
          try {
            const subs = await getSubmissionsForBoard(reg.slug)
            const match = subs.find((s) => s.author?.toLowerCase() === addr.toLowerCase())
            if (match) {
              const submission = await fetchObject(match.submissionRef)
              const { valid } = validate(submission)
              if (!valid) return null
              return submission?.author?.userFeed || null
            }
          } catch { /* skip */ }
          return null
        })
      )
      userFeedRef = results.find((r) => r) || null
    }

    if (!userFeedRef) return { entries: [], feedFound: false }

    try {
      const feedIndex = await resolveFeed(userFeedRef)
      const { valid } = validate(feedIndex)
      if (valid && feedIndex?.entries?.length) {
        return { entries: [...feedIndex.entries].reverse(), feedFound: true }
      }
    } catch { /* feed not available */ }

    return { entries: [], feedFound: true }
  },
  enabled: computed(() => !!address.value),
  staleTime: 30_000,
})

async function goToThread(entry) {
  let rootHex
  if (entry.kind === 'post') {
    rootHex = refToHex(entry.submissionRef || entry.submissionId)
  } else {
    try {
      const sub = await fetchObject(entry.submissionRef || entry.submissionId)
      const { valid } = validate(sub)
      rootHex = valid ? refToHex(sub.rootSubmissionId || entry.submissionRef) : refToHex(entry.submissionRef || entry.submissionId)
    } catch {
      rootHex = refToHex(entry.submissionRef || entry.submissionId)
    }
  }
  if (rootHex && entry.boardId) {
    router.push({ name: 'thread', params: { slug: entry.boardId, rootSubId: rootHex } })
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-foreground">{{ displayName(address) }}</h1>
    <p class="text-xs font-mono text-muted-foreground mt-1 break-all">{{ address }}</p>

    <div v-if="isLoading" class="mt-6 space-y-2">
      <Skeleton v-for="i in 4" :key="i" class="h-14 rounded-lg" />
    </div>

    <Alert v-else-if="isError" variant="destructive" class="mt-6">
      <AlertDescription>{{ error?.message || 'Failed to load profile' }}</AlertDescription>
    </Alert>

    <div v-else-if="profile && !profile.feedFound" class="mt-6 text-center py-12">
      <p class="text-lg mb-2 text-foreground">No activity found.</p>
      <p class="text-sm text-muted-foreground">This user hasn't published any submissions yet.</p>
    </div>

    <div v-else-if="!profile?.entries?.length" class="mt-6 text-center py-12">
      <p class="text-muted-foreground">No submissions yet.</p>
    </div>

    <div v-else class="mt-6 space-y-2">
      <p class="text-sm text-muted-foreground mb-3">{{ profile.entries.length }} submission{{ profile.entries.length > 1 ? 's' : '' }}</p>

      <Card
        v-for="entry in profile.entries"
        :key="entry.submissionId || entry.submissionRef"
        @click="goToThread(entry)"
        class="cursor-pointer hover:bg-accent/50 transition-colors py-0 gap-0"
      >
        <CardContent class="p-3">
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge :variant="entry.kind === 'post' ? 'default' : 'secondary'" class="text-[10px]">
              {{ entry.kind }}
            </Badge>
            <span>r/{{ entry.boardId }}</span>
            <span v-if="entry.createdAt">· {{ timeAgo(entry.createdAt) }}</span>
          </div>
          <div class="text-xs font-mono text-muted-foreground/60 mt-1 truncate">
            {{ entry.submissionRef || entry.submissionId }}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
