<script setup>
import { reactive, watch, computed } from 'vue'
import { useCuratorDeclarations, setCuratorPref } from '../composables/useCurators'
import { useCuratorPrefsStore } from '../stores/curators.js'
import { fetchObject } from '../swarm/fetch.js'
import { validate } from '../protocol/objects.js'
import { truncateAddress } from '../lib/format.js'

const { data: curators, isLoading, isError, error } = useCuratorDeclarations()
const curatorPrefs = useCuratorPrefsStore()

const profiles = reactive(new Map())

async function loadProfiles() {
  if (!curators.value) return
  await Promise.allSettled(
    curators.value
      .filter((c) => !profiles.has(c.curator))
      .map(async (c) => {
        try {
          const profile = await fetchObject(c.curatorProfileRef)
          const { valid } = validate(profile)
          profiles.set(c.curator, valid ? profile : null)
        } catch {
          profiles.set(c.curator, null)
        }
      })
  )
}

watch(curators, loadProfiles, { immediate: true })

function getProfile(addr) {
  return profiles.get(addr) || null
}

function isSelected(addr, boardSlug) {
  return curatorPrefs.getPreference(boardSlug)?.toLowerCase() === addr.toLowerCase()
}

function selectCurator(addr, boardSlug) {
  setCuratorPref(boardSlug, addr)
}
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold mb-2">Curators</h2>
    <p class="text-gray-500 mb-6">Choose a curator to change how boards are moderated and ordered.</p>

    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-24 rounded-lg bg-gray-800 animate-pulse" />
    </div>

    <div v-else-if="isError" class="p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-400">
      {{ error?.message || 'Failed to load curators' }}
    </div>

    <div v-else-if="!curators?.length" class="text-center py-16 text-gray-500">
      No curators have declared themselves yet.
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="c in curators"
        :key="c.curator"
        class="p-4 rounded-lg bg-gray-900 border border-gray-800"
      >
        <div class="text-base font-semibold text-gray-100">
          {{ getProfile(c.curator)?.name || truncateAddress(c.curator) }}
        </div>
        <div class="text-xs font-mono text-gray-600 mt-0.5">
          {{ c.curator }}
        </div>
        <p v-if="getProfile(c.curator)?.description" class="text-sm text-gray-400 mt-2">
          {{ getProfile(c.curator).description }}
        </p>

        <div v-if="getProfile(c.curator)?.boardFeeds" class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="(feedUrl, boardSlug) in getProfile(c.curator).boardFeeds"
            :key="boardSlug"
            @click="selectCurator(c.curator, boardSlug)"
            :disabled="isSelected(c.curator, boardSlug)"
            class="px-2.5 py-1 text-xs rounded-md transition-colors"
            :class="isSelected(c.curator, boardSlug)
              ? 'bg-green-900/30 text-green-400 border border-green-800 cursor-default'
              : 'bg-gray-800 text-gray-300 border border-gray-700 hover:border-orange-500 hover:text-orange-400'"
          >
            {{ isSelected(c.curator, boardSlug) ? `✓ r/${boardSlug}` : `Use for r/${boardSlug}` }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
