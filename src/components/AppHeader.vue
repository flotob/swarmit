<script setup>
import { useAuthStore } from '../stores/auth'
import { useUiStore } from '../stores/ui'
import { useSubmissionsStore } from '../stores/submissions'
import { useWallet } from '../composables/useWallet'
import { useColorMode } from '../composables/useColorMode'
import { truncateAddress } from '../lib/format.js'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Bell, Sun, Moon, Monitor } from 'lucide-vue-next'

const auth = useAuthStore()
const ui = useUiStore()
const submissions = useSubmissionsStore()
const wallet = useWallet()
const { preference, setMode } = useColorMode()

function cycleColorMode() {
  const modes = ['light', 'dark', 'auto']
  const next = modes[(modes.indexOf(preference.value) + 1) % modes.length]
  setMode(next)
}

async function connectWallet() {
  try {
    await wallet.connect()
  } catch (err) {
    console.error('Wallet connect failed:', err)
  }
}
</script>

<template>
  <header class="sticky top-0 z-50 bg-header border-b border-header-foreground/10">
    <div class="px-4 h-12 flex items-center justify-between">
      <div class="flex items-center gap-6">
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

      <div class="flex items-center gap-2">
        <button
          @click="ui.toggleSidebar()"
          class="hidden lg:inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors"
          :class="ui.sidebarOpen
            ? 'text-header-foreground bg-header-foreground/10'
            : 'text-header-foreground/60 hover:text-header-foreground hover:bg-header-foreground/10'"
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

        <button
          @click="cycleColorMode"
          class="p-1.5 rounded-md text-header-foreground/60 hover:text-header-foreground hover:bg-header-foreground/10 transition-colors"
          :title="`Color mode: ${preference}`"
        >
          <Sun v-if="preference === 'light'" class="w-4 h-4" />
          <Moon v-else-if="preference === 'dark'" class="w-4 h-4" />
          <Monitor v-else class="w-4 h-4" />
        </button>

        <Badge variant="outline" class="text-[10px] border-header-foreground/20" :class="auth.swarmDetected ? 'text-success' : 'text-destructive'">
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
          class="text-xs font-mono text-header-foreground/60 hover:text-header-foreground transition-colors"
        >
          {{ truncateAddress(auth.userAddress) }}
        </router-link>
      </div>
    </div>
  </header>
</template>
