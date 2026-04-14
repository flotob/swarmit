<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { useAuthStore } from '../stores/auth'
import { useSwarm } from '../composables/useSwarm'
import { timeAgo } from '../lib/format.js'
import { displayName } from '../lib/displayName.js'
import { refToHex } from '../protocol/references.js'
import { validate } from '../protocol/objects.js'
import { fetchObject } from '../swarm/fetch.js'
import { getUserFeeds } from '../chain/events.js'
import { isContractConfigured } from '../chain/contract.js'
import { decodeFeedJSON, topicToSwarmFormat } from 'swarmit-protocol/feeds'
import { isUsernameRegistryConfigured } from '../chain/username-registry.js'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
import { Alert, AlertDescription } from '../components/ui/alert'
import ClaimUsernameCard from '../components/ClaimUsernameCard.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const swarm = useSwarm()
const address = computed(() => route.params.address)

const isOwnProfile = computed(() =>
  !!auth.userAddress &&
  address.value?.toLowerCase() === auth.userAddress.toLowerCase(),
)

const showUsernameCard = computed(() =>
  isOwnProfile.value && isUsernameRegistryConfigured(),
)

const { data: profile, isLoading, isError, error } = useQuery({
  queryKey: ['userProfile', address],
  queryFn: async () => {
    const addr = address.value

    // Feed entries are discovery aids, not authoritative authorship proof.
    // TODO: verify submission.author.address matches addr for other users' profiles.
    let feedCoordinates = null

    if (isContractConfigured()) {
      try {
        const feeds = await getUserFeeds(addr)
        if (feeds.length > 0) {
          feedCoordinates = {
            topic: feeds[0].feedTopic,
            owner: feeds[0].feedOwner,
          }
        }
      } catch {
        // V3 contract may not be deployed yet — fall through
      }
    }

    if (!feedCoordinates) {
      return { entries: [], feedFound: false }
    }

    try {
      const readParams = {
        topic: topicToSwarmFormat(feedCoordinates.topic),
        owner: feedCoordinates.owner,
      }

      let latest
      try {
        latest = await swarm.readFeedEntry(readParams)
      } catch (err) {
        if (err?.data?.reason === 'feed_empty' || err?.message?.includes('feed_empty')) {
          return { entries: [], feedFound: true }
        }
        throw err
      }

      const totalEntries = latest.nextIndex ?? (latest.index + 1)
      const MAX_ENTRIES = 100
      const startIndex = Math.max(0, totalEntries - MAX_ENTRIES)

      const entries = await Promise.all(
        Array.from({ length: totalEntries - startIndex }, (_, i) =>
          swarm.readFeedEntry({ ...readParams, index: startIndex + i })
            .then(decodeFeedJSON)
            .catch(() => null)
        ),
      )

      return {
        entries: entries.filter(Boolean).reverse(),
        feedFound: true,
      }
    } catch {
      return { entries: [], feedFound: false }
    }
  },
  enabled: computed(() => !!address.value),
  staleTime: 30_000,
})

async function goToThread(entry) {
  let rootHex
  if (entry.kind === 'post') {
    rootHex = refToHex(entry.submissionRef)
  } else {
    try {
      const sub = await fetchObject(entry.submissionRef)
      const { valid } = validate(sub)
      rootHex = valid ? refToHex(sub.rootSubmissionId || entry.submissionRef) : refToHex(entry.submissionRef)
    } catch {
      rootHex = refToHex(entry.submissionRef)
    }
  }
  if (rootHex && entry.boardSlug) {
    router.push({ name: 'thread', params: { slug: entry.boardSlug, rootSubId: rootHex } })
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-foreground">{{ displayName(address) }}</h1>
    <p class="text-xs font-mono text-muted-foreground mt-1 break-all">{{ address }}</p>

    <ClaimUsernameCard v-if="showUsernameCard" :address="address" />

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
        :key="entry.submissionRef"
        @click="goToThread(entry)"
        class="cursor-pointer hover:bg-accent/50 transition-colors py-0 gap-0"
      >
        <CardContent class="p-3">
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge :variant="entry.kind === 'post' ? 'default' : 'secondary'" class="text-[10px]">
              {{ entry.kind }}
            </Badge>
            <span>r/{{ entry.boardSlug }}</span>
            <span v-if="entry.createdAt">· {{ timeAgo(entry.createdAt) }}</span>
          </div>
          <div class="text-xs font-mono text-muted-foreground/60 mt-1 truncate">
            {{ entry.submissionRef }}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
