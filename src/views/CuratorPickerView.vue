<script setup>
import { ref } from 'vue'
import { useCuratorDeclarations, setCuratorPref } from '../composables/useCurators'
import { fetchObject } from '../swarm/fetch.js'
import { truncateAddress } from '../lib/format.js'
import { getCuratorPref } from '../state.js'

const { data: curators, isLoading, isError, error } = useCuratorDeclarations()

// Fetch profiles for all curators
const profiles = ref(new Map()) // address → profile

async function loadProfiles() {
  if (!curators.value) return
  for (const c of curators.value) {
    if (profiles.value.has(c.curator)) continue
    try {
      const profile = await fetchObject(c.curatorProfileRef)
      profiles.value.set(c.curator, profile)
    } catch {
      profiles.value.set(c.curator, null)
    }
  }
}

// Watch for curators to load
import { watch } from 'vue'
watch(curators, loadProfiles, { immediate: true })

function getProfile(addr) {
  return profiles.value.get(addr) || null
}

function isSelected(addr, boardSlug) {
  return getCuratorPref(boardSlug)?.toLowerCase() === addr.toLowerCase()
}

function selectCurator(addr, boardSlug) {
  setCuratorPref(boardSlug, addr)
  // Force reactivity update
  profiles.value = new Map(profiles.value)
}
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold mb-2">Curators</h2>
    <p class="text-gray-500 mb-6">Choose a curator to change how boards are moderated and ordered.</p>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-24 rounded-lg bg-gray-800 animate-pulse" />
    </div>

    <!-- Error -->
    <div v-else-if="isError" class="p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-400">
      {{ error?.message || 'Failed to load curators' }}
    </div>

    <!-- Empty -->
    <div v-else-if="!curators?.length" class="text-center py-16 text-gray-500">
      No curators have declared themselves yet.
    </div>

    <!-- Curator list -->
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

        <!-- Board feeds -->
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
