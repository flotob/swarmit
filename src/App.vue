<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useAuthStore } from './stores/auth'
import { useUiStore } from './stores/ui'
import { isAvailable as isSwarmAvailable } from './lib/swarm.js'
import { isAvailable as isWalletAvailable } from './lib/ethereum.js'
import { CHAIN_ID } from './config'
import { useSubmissionStatus } from './composables/useSubmissionStatus'
import { useAutoShowSidebar } from './composables/useAutoShowSidebar'
import AppHeader from './components/AppHeader.vue'
import ActivityPanel from './components/ActivityPanel.vue'
import MobileBottomBar from './components/MobileBottomBar.vue'
import MobileDrawer from './components/MobileDrawer.vue'

const auth = useAuthStore()
const ui = useUiStore()

useSubmissionStatus()
useAutoShowSidebar()

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
  <div class="min-h-screen bg-gray-950 text-gray-200 flex flex-col">
    <AppHeader />

    <div class="flex-1 flex justify-center px-4">
      <div class="flex w-full max-w-5xl">
        <main class="flex-1 min-w-0 py-6 pb-16 lg:pb-6">
          <router-view />
        </main>

        <!-- Desktop sidebar (hidden below lg by CSS) -->
        <aside
          v-if="ui.sidebarOpen"
          class="hidden lg:block w-56 shrink-0 border-l border-gray-800 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto p-3"
        >
          <ActivityPanel />
        </aside>
      </div>
    </div>

    <footer class="px-4 py-8 text-center text-sm text-gray-600">
      Swarmit — decentralized message board on Swarm + Gnosis Chain
    </footer>

    <MobileBottomBar />

    <!-- Mobile drawer (hidden at lg+ by internal lg:hidden) -->
    <MobileDrawer :open="ui.sidebarOpen" @close="ui.closeSidebar()">
      <ActivityPanel />
    </MobileDrawer>
  </div>
</template>
