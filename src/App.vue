<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useAuthStore } from './stores/auth'
import { isAvailable as isSwarmAvailable } from './lib/swarm.js'
import { isAvailable as isWalletAvailable } from './lib/ethereum.js'
import AppHeader from './components/AppHeader.vue'

const auth = useAuthStore()

function detectProviders() {
  auth.setSwarmDetected(isSwarmAvailable())

  if (isWalletAvailable()) {
    window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
      if (accounts?.length > 0) {
        auth.setWallet(accounts[0])
      }
    }).catch(() => {})
  }
}

// Listen for wallet account/chain changes
function onAccountsChanged(accounts) {
  if (accounts?.length > 0) {
    auth.setWallet(accounts[0])
  } else {
    auth.clearWallet()
  }
}

onMounted(() => {
  detectProviders()

  // Retry with backoff if Swarm provider not yet injected by Freedom Browser's preload
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

  // Register wallet event listeners
  if (window.ethereum?.on) {
    window.ethereum.on('accountsChanged', onAccountsChanged)
  }
})

onUnmounted(() => {
  if (window.ethereum?.removeListener) {
    window.ethereum.removeListener('accountsChanged', onAccountsChanged)
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-950 text-gray-200">
    <AppHeader />
    <main class="max-w-4xl mx-auto px-4 py-6">
      <router-view />
    </main>
    <footer class="max-w-4xl mx-auto px-4 py-8 text-center text-sm text-gray-600">
      Swarmit — decentralized message board on Swarm + Gnosis Chain
    </footer>
  </div>
</template>
