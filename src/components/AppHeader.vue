<script setup>
import { useAuthStore } from '../stores/auth'
import { useUiStore } from '../stores/ui'
import { useSubmissionsStore } from '../stores/submissions'
import { useWallet } from '../composables/useWallet'
import { truncateAddress } from '../lib/format.js'

const auth = useAuthStore()
const ui = useUiStore()
const submissions = useSubmissionsStore()
const wallet = useWallet()

async function connectWallet() {
  try {
    await wallet.connect()
  } catch (err) {
    console.error('Wallet connect failed:', err)
  }
}
</script>

<template>
  <header class="sticky top-0 z-50 bg-gray-900 border-b border-gray-800">
    <div class="px-4 h-14 flex items-center justify-between">
      <div class="flex items-center gap-6">
        <router-link to="/" class="text-lg font-bold text-orange-400 hover:text-orange-300">
          swarmit
        </router-link>
        <nav class="hidden sm:flex items-center gap-4 text-sm">
          <router-link to="/" class="text-gray-400 hover:text-gray-200">Boards</router-link>
          <router-link to="/curators" class="text-gray-400 hover:text-gray-200">Curators</router-link>
          <router-link to="/create-board" class="text-gray-400 hover:text-gray-200">Create Board</router-link>
        </nav>
      </div>
      <div class="flex items-center gap-3">
        <!-- Desktop activity toggle -->
        <button
          @click="ui.toggleSidebar()"
          class="hidden lg:inline-flex items-center gap-1.5 text-xs transition-colors"
          :class="ui.sidebarOpen ? 'text-orange-400' : 'text-gray-500 hover:text-gray-300'"
          :title="ui.sidebarOpen ? 'Hide activity' : 'Show activity'"
        >
          <span class="relative">
            &#9679;
            <span
              v-if="submissions.pending.length"
              class="absolute -top-1.5 -right-2.5 min-w-3.5 h-3.5 flex items-center justify-center rounded-full bg-orange-500 text-white text-[9px] font-bold px-0.5"
            >
              {{ submissions.pending.length }}
            </span>
          </span>
          Activity
        </button>

        <span v-if="auth.swarmDetected" class="text-xs text-green-500">Swarm</span>
        <span v-else class="text-xs text-red-500">No Swarm</span>
        <button
          v-if="!auth.walletConnected"
          @click="connectWallet"
          class="px-3 py-1.5 text-sm font-medium rounded-md bg-orange-500 text-white hover:bg-orange-600 transition-colors"
        >
          Connect
        </button>
        <router-link
          v-else
          :to="`/u/${auth.userAddress}`"
          class="text-xs font-mono text-gray-400 hover:text-gray-200"
        >
          {{ truncateAddress(auth.userAddress) }}
        </router-link>
      </div>
    </div>
  </header>
</template>
