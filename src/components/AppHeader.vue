<script setup>
import { useAuthStore } from '../stores/auth'
import { useUiStore } from '../stores/ui'
import { useSubmissionsStore } from '../stores/submissions'
import { useWallet } from '../composables/useWallet'
import { truncateAddress } from '../lib/format.js'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Bell } from 'lucide-vue-next'

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
  <header class="sticky top-0 z-50 bg-card border-b border-border">
    <div class="px-4 h-14 flex items-center justify-between">
      <div class="flex items-center gap-6">
        <router-link to="/" class="text-lg font-bold text-primary hover:text-primary/80 transition-colors">
          swarmit
        </router-link>
        <nav class="hidden sm:flex items-center gap-1 text-sm">
          <router-link
            :to="{ name: 'boards' }"
            class="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Boards
          </router-link>
          <router-link
            :to="{ name: 'curators' }"
            class="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Curators
          </router-link>
          <router-link
            :to="{ name: 'create-board' }"
            class="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Create Board
          </router-link>
        </nav>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="ui.toggleSidebar()"
          class="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors"
          :class="ui.sidebarOpen
            ? 'text-primary bg-primary/10'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'"
          :title="ui.sidebarOpen ? 'Hide activity' : 'Show activity'"
        >
          <span class="relative">
            <Bell class="w-4 h-4" />
            <Badge
              v-if="submissions.pending.length"
              class="absolute -top-2 -right-2.5 h-4 min-w-4 px-1 text-[9px] justify-center"
            >
              {{ submissions.pending.length }}
            </Badge>
          </span>
          Activity
        </button>

        <Badge variant="outline" class="text-[10px]" :class="auth.swarmDetected ? 'text-success border-success/30' : 'text-destructive border-destructive/30'">
          {{ auth.swarmDetected ? 'Swarm' : 'No Swarm' }}
        </Badge>

        <Button
          v-if="!auth.walletConnected"
          size="sm"
          @click="connectWallet"
        >
          Connect
        </Button>
        <router-link
          v-else
          :to="`/u/${auth.userAddress}`"
          class="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          {{ truncateAddress(auth.userAddress) }}
        </router-link>
      </div>
    </div>
  </header>
</template>
