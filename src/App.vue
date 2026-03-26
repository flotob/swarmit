<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useAuthStore } from './stores/auth'
import { isAvailable as isSwarmAvailable } from './lib/swarm.js'
import { isAvailable as isWalletAvailable } from './lib/ethereum.js'
import { CHAIN_ID } from './config'
import { useSubmissionStatus } from './composables/useSubmissionStatus'
import AppHeader from './components/AppHeader.vue'
import ActivityPanel from './components/ActivityPanel.vue'

const auth = useAuthStore()
useSubmissionStatus() // Start polling for pending submission pickups

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
  <div class="min-h-screen bg-gray-950 text-gray-200">
    <AppHeader />
    <main class="max-w-4xl mx-auto px-4 py-6">
      <router-view />
      <ActivityPanel />
    </main>
    <footer class="max-w-4xl mx-auto px-4 py-8 text-center text-sm text-gray-600">
      Swarmit — decentralized message board on Swarm + Gnosis Chain
    </footer>
  </div>
</template>
