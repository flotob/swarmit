<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useUiStore } from '../stores/ui'
import { useSubmissionsStore } from '../stores/submissions'
import { useViewsStore, boardScope, GLOBAL_SCOPE } from '../stores/views'
import { useWallet } from '../composables/useWallet'
import { useColorMode } from '../composables/useColorMode'
import { displayName } from '../lib/format.js'
import { Bell, Wallet, Radio } from 'lucide-vue-next'

const route = useRoute()
const auth = useAuthStore()
const ui = useUiStore()
const submissions = useSubmissionsStore()
const views = useViewsStore()
const wallet = useWallet()
const { preference } = useColorMode()

preference.value = 'light'

async function connectWallet() {
  try {
    await wallet.connect()
  } catch (err) {
    console.error('Wallet connect failed:', err)
  }
}

const slug = computed(() => route.params.slug || null)
const routeName = computed(() => route.name)

const viewScope = computed(() => {
  if (routeName.value === 'home') return GLOBAL_SCOPE
  if (routeName.value === 'board' && slug.value) return boardScope(slug.value)
  return null
})

const activeView = computed(() => {
  if (!viewScope.value) return null
  return views.getView(viewScope.value)
})

const defaultViewId = computed(() => viewScope.value ? views.getDefaultViewId(viewScope.value) : null)

function selectView(viewId) {
  if (!viewScope.value) return
  const effective = activeView.value || defaultViewId.value
  if (viewId === effective && !activeView.value) return
  views.setView(viewScope.value, viewId === activeView.value ? null : viewId)
}

const availableViews = computed(() => viewScope.value ? views.getAvailableViews(viewScope.value) : [])
</script>

<template>
  <header class="sticky top-0 z-50 bg-header border-b border-header-border">
    <div class="px-4 h-12 flex items-end justify-between">
      <div class="flex items-end gap-1">
        <router-link to="/" class="text-lg font-bold text-header-foreground hover:opacity-80 transition-opacity leading-none mb-[5px] mr-2">
          <span class="inline-block scale-x-[-1] text-[1.7em] leading-[0] align-baseline">🐝</span> swarmit
        </router-link>

        <span
          v-if="slug"
          class="font-bold uppercase text-[11px] tracking-wider text-header-foreground leading-none mb-[6px] mr-1"
        >
          <router-link
            :to="{ name: 'board', params: { slug } }"
            class="hover:opacity-70 transition-opacity"
          >
            {{ slug }}
          </router-link>
        </span>

        <template v-if="availableViews.length">
          <button
            v-for="id in availableViews"
            :key="id"
            class="header-tab"
            :class="activeView === id || (!activeView && id === defaultViewId)
              ? 'header-tab-active'
              : 'header-tab-inactive'"
            @click="selectView(id)"
          >
            {{ id.charAt(0).toUpperCase() + id.slice(1) }}
          </button>
        </template>

        <span
          v-else-if="routeName === 'thread'"
          class="header-tab header-tab-active"
        >
          comments
        </span>

        <span
          v-else-if="routeName === 'compose-post'"
          class="header-tab header-tab-active"
        >
          submit
        </span>
      </div>

      <!-- User bar -->
      <div class="flex items-center bg-header-foreground/5 rounded-t-md px-1 text-xs text-header-foreground/70">
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

        <span class="inline-flex items-center gap-1 px-2 py-1.5">
          <Radio class="w-3.5 h-3.5" :class="auth.swarmDetected ? 'text-success' : 'text-destructive'" />
          {{ auth.swarmDetected ? 'Swarm' : 'No Swarm' }}
        </span>

        <span class="text-header-foreground/20">|</span>

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
          {{ displayName(auth.userAddress) }}
        </router-link>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header-tab {
  padding: 0.25rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: 0.25rem 0.25rem 0 0;
  transition: background-color 0.15s, color 0.15s;
  cursor: pointer;
  margin-bottom: -1px;
  border: 1px solid transparent;
  border-bottom: none;
}

.header-tab-active {
  background-color: var(--background);
  color: var(--header-foreground);
  border-color: var(--header-border);
}

.header-tab-inactive {
  color: var(--header-foreground);
  opacity: 0.6;
}

</style>
