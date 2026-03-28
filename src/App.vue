<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useAuthStore } from './stores/auth'
import { useUiStore } from './stores/ui'
import { isAvailable as isSwarmAvailable } from './lib/swarm.js'
import { isAvailable as isWalletAvailable } from './lib/ethereum.js'
import { CHAIN_ID } from './config'
import { useSubmissionStatus } from './composables/useSubmissionStatus'
import { useAutoShowSidebar } from './composables/useAutoShowSidebar'
import { useColorMode } from './composables/useColorMode'
import BoardBar from './components/BoardBar.vue'
import AppHeader from './components/AppHeader.vue'
import ActivityPanel from './components/ActivityPanel.vue'
import MobileBottomBar from './components/MobileBottomBar.vue'
import MobileDrawer from './components/MobileDrawer.vue'

const auth = useAuthStore()
const ui = useUiStore()

useSubmissionStatus()
useAutoShowSidebar()
useColorMode()

async function checkWalletState() {
  if (!isWalletAvailable()) {
    auth.clearWallet()
    return
  }

  try {
    const [accounts, chainId] = await Promise.all([
      window.ethereum.request({ method: 'eth_accounts' }),
      window.ethereum.request({ method: 'eth_chainId' }),
    ])

    const onCorrectChain = parseInt(chainId, 16) === CHAIN_ID
    if (accounts?.length > 0 && onCorrectChain) {
      auth.setWallet(accounts[0])
    } else {
      auth.clearWallet()
    }
  } catch {
    auth.clearWallet()
  }
}

function detectProviders() {
  auth.setSwarmDetected(isSwarmAvailable())
  checkWalletState()
}

function onAccountsChanged() { checkWalletState() }
function onChainChanged() { checkWalletState() }

onMounted(() => {
  detectProviders()

  if (!auth.swarmDetected) {
    let retries = 0
    const maxRetries = 5
    const poll = () => {
      retries++
      detectProviders()
      if (!auth.swarmDetected && retries < maxRetries) {
        setTimeout(poll, retries * 100)
      }
    }
    setTimeout(poll, 100)
  }

  if (window.ethereum?.on) {
    window.ethereum.on('accountsChanged', onAccountsChanged)
    window.ethereum.on('chainChanged', onChainChanged)
  }
})

onUnmounted(() => {
  if (window.ethereum?.removeListener) {
    window.ethereum.removeListener('accountsChanged', onAccountsChanged)
    window.ethereum.removeListener('chainChanged', onChainChanged)
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <BoardBar />
    <AppHeader />

    <div class="flex-1">
      <main class="px-4 py-4 pb-16 lg:pb-4">
        <router-view />
      </main>
    </div>

    <Teleport to="body">
      <Transition name="backdrop-fade">
        <div
          v-if="ui.sidebarOpen"
          class="hidden lg:block fixed inset-0 z-40 bg-black/20"
          @click="ui.closeSidebar()"
        />
      </Transition>

      <Transition name="panel-slide">
        <aside
          v-if="ui.sidebarOpen"
          class="hidden lg:flex fixed z-50 right-4 top-1/2 -translate-y-1/2 w-80 h-[80vh] flex-col rounded-xl border border-border bg-card shadow-xl overflow-hidden"
        >
          <div class="flex-1 overflow-y-auto p-4">
            <ActivityPanel />
          </div>
        </aside>
      </Transition>
    </Teleport>

    <footer class="px-4 py-8 text-center text-sm text-muted-foreground">
      Swarmit — decentralized message board on Swarm + Gnosis Chain
    </footer>

    <MobileBottomBar />

    <MobileDrawer :open="ui.sidebarOpen" @close="ui.closeSidebar()">
      <ActivityPanel />
    </MobileDrawer>
  </div>
</template>

<style>
.backdrop-fade-enter-active,
.backdrop-fade-leave-active {
  transition: opacity 0.25s ease;
}
.backdrop-fade-enter-from,
.backdrop-fade-leave-to {
  opacity: 0;
}

.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.panel-slide-enter-from,
.panel-slide-leave-to {
  transform: translateX(2rem);
  opacity: 0;
}
</style>
