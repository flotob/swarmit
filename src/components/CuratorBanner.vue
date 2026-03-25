<script setup>
import { truncateAddress } from '../lib/format.js'

defineProps({
  curatorName: String,
  curatorAddress: String,
})
</script>

<template>
  <div class="px-3 py-2 mb-4 rounded-md bg-gray-800/50 border border-gray-700 text-sm text-gray-400 flex items-center justify-between">
    <span>
      Showing view from
      <span class="text-gray-200 font-medium">{{ curatorName || truncateAddress(curatorAddress) }}</span>
    </span>
    <router-link to="/curators" class="text-orange-400 hover:text-orange-300 text-xs">
      Change curator
    </router-link>
  </div>
</template>
