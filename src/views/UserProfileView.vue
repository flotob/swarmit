<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { useAuthStore } from '../stores/auth'
import { truncateAddress, timeAgo } from '../lib/format.js'
import { refToHex } from '../protocol/references.js'
import { resolveFeed } from '../swarm/feeds.js'
import { fetchObject } from '../swarm/fetch.js'
import { getBoardRegistrations, getSubmissionsForBoard } from '../chain/events.js'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const address = computed(() => route.params.address)

const { data: profile, isLoading, isError, error } = useQuery({
  queryKey: ['userProfile', address],
  queryFn: async () => {
    const addr = address.value

    // Find user feed — check if current user first
    let userFeedRef = null
    if (auth.userAddress?.toLowerCase() === addr.toLowerCase() && auth.userFeed) {
      userFeedRef = auth.userFeed
    }

    // Search chain submissions in parallel for the user's feed
    if (!userFeedRef) {
      const regs = await getBoardRegistrations()
      const results = await Promise.all(
        regs.map(async (reg) => {
          try {
            const subs = await getSubmissionsForBoard(reg.slug)
            const match = subs.find((s) => s.author?.toLowerCase() === addr.toLowerCase())
            if (match) {
              const submission = await fetchObject(match.submissionRef)
              return submission?.author?.userFeed || null
            }
          } catch { /* skip */ }
          return null
        })
      )
      userFeedRef = results.find((r) => r) || null
    }

    if (!userFeedRef) return { entries: [], feedFound: false }

    // Resolve feed index
    try {
      const feedIndex = await resolveFeed(userFeedRef)
      if (feedIndex?.entries?.length) {
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
      rootHex = refToHex(sub.rootSubmissionId || entry.submissionRef)
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
    <h2 class="text-2xl font-bold">{{ truncateAddress(address) }}</h2>
    <p class="text-xs font-mono text-gray-600 mt-1 break-all">{{ address }}</p>

    <!-- Loading -->
    <div v-if="isLoading" class="mt-6 space-y-2">
      <div v-for="i in 4" :key="i" class="h-14 rounded-lg bg-gray-800 animate-pulse" />
    </div>

    <!-- Error -->
    <div v-else-if="isError" class="mt-6 p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-400">
      {{ error?.message || 'Failed to load profile' }}
    </div>

    <!-- No feed found -->
    <div v-else-if="profile && !profile.feedFound" class="mt-6 text-center py-12 text-gray-500">
      <p class="text-lg mb-2">No activity found.</p>
      <p class="text-sm">This user hasn't published any submissions yet.</p>
    </div>

    <!-- Empty feed -->
    <div v-else-if="!profile?.entries?.length" class="mt-6 text-center py-12 text-gray-500">
      <p>No submissions yet.</p>
    </div>

    <!-- Submission history -->
    <div v-else class="mt-6 space-y-2">
      <p class="text-sm text-gray-500 mb-3">{{ profile.entries.length }} submission{{ profile.entries.length > 1 ? 's' : '' }}</p>

      <div
        v-for="entry in profile.entries"
        :key="entry.submissionId || entry.submissionRef"
        @click="goToThread(entry)"
        class="p-3 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 cursor-pointer transition-colors"
      >
        <div class="flex items-center gap-2 text-xs text-gray-500">
          <span class="px-1.5 py-0.5 rounded text-[10px] font-medium"
            :class="entry.kind === 'post' ? 'bg-blue-900/30 text-blue-400' : 'bg-purple-900/30 text-purple-400'"
          >
            {{ entry.kind }}
          </span>
          <span>r/{{ entry.boardId }}</span>
          <span v-if="entry.createdAt">· {{ timeAgo(entry.createdAt) }}</span>
        </div>
        <div class="text-xs font-mono text-gray-600 mt-1 truncate">
          {{ entry.submissionRef || entry.submissionId }}
        </div>
      </div>
    </div>
  </div>
</template>
