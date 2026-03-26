<script setup>
import { useAuthStore } from '../stores/auth'
import { useUiStore } from '../stores/ui'
import { useSubmissionsStore } from '../stores/submissions'
import { useWallet } from '../composables/useWallet'
import { useColorMode } from '../composables/useColorMode'
import { truncateAddress } from '../lib/format.js'
import { Bell, Wallet, Radio } from 'lucide-vue-next'

const auth = useAuthStore()
const ui = useUiStore()
const submissions = useSubmissionsStore()
const wallet = useWallet()
const { preference } = useColorMode()

// Enforce light mode for now
preference.value = 'light'

async function connectWallet() {
  try {
    await wallet.connect()
  } catch (err) {
    console.error('Wallet connect failed:', err)
  }
}
</script>

<template>
  <header class="sticky top-0 z-50 bg-header border-b border-header-border">
    <div class="px-4 h-12 flex items-end justify-between">
      <div class="flex items-center gap-6 pb-2">
        <router-link to="/" class="text-lg font-bold text-header-foreground hover:opacity-80 transition-opacity">
          swarmit
        </router-link>
        <nav class="hidden sm:flex items-center gap-1 text-sm">
          <router-link
            :to="{ name: 'boards' }"
            class="px-3 py-1 rounded-md text-header-foreground/70 hover:text-header-foreground hover:bg-header-foreground/10 transition-colors"
          >
            Boards
          </router-link>
          <router-link
            :to="{ name: 'curators' }"
            class="px-3 py-1 rounded-md text-header-foreground/70 hover:text-header-foreground hover:bg-header-foreground/10 transition-colors"
          >
            Curators
          </router-link>
          <router-link
            :to="{ name: 'create-board' }"
            class="px-3 py-1 rounded-md text-header-foreground/70 hover:text-header-foreground hover:bg-header-foreground/10 transition-colors"
          >
            Create Board
          </router-link>
        </nav>
      </div>

      <!-- User bar: anchored to bottom of header -->
      <div class="flex items-center bg-header-foreground/5 rounded-t-md px-1 text-xs text-header-foreground/70">
        <!-- Activity -->
        <button
          @click="ui.toggleSidebar()"
          class="hidden lg:inline-flex items-center gap-1 px-2 py-1.5 hover:text-header-foreground transition-colors"
          :class="ui.sidebarOpen ? 'text-header-foreground' : ''"
        >
          <Bell class="w-3.5 h-3.5" />
          Activity
          <span v-if="submissions.pending.length" class="font-bold text-primary">({{ submissions.pending.length }})</span>
        </button>

        <span class="text-header-foreground/20 hidden lg:inline">|</span>

        <!-- Swarm status -->
        <span class="inline-flex items-center gap-1 px-2 py-1.5">
          <Radio class="w-3.5 h-3.5" :class="auth.swarmDetected ? 'text-success' : 'text-destructive'" />
          {{ auth.swarmDetected ? 'Swarm' : 'No Swarm' }}
        </span>

        <span class="text-header-foreground/20">|</span>

        <!-- Wallet -->
        <button
          v-if="!auth.walletConnected"
          @click="connectWallet"
          class="inline-flex items-center gap-1 px-2 py-1.5 hover:text-header-foreground font-bold transition-colors"
        >
          <Wallet class="w-3.5 h-3.5" />
          connect
        </button>
        <router-link
          v-else
          :to="`/u/${auth.userAddress}`"
          class="inline-flex items-center gap-1 px-2 py-1.5 hover:text-header-foreground font-bold transition-colors"
        >
          <Wallet class="w-3.5 h-3.5" />
          {{ truncateAddress(auth.userAddress) }}
        </router-link>
      </div>
    </div>
  </header>
</template>
