<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import AppHeader from './components/AppHeader.vue'

const auth = useAuthStore()

onMounted(() => {
  const swarmAvailable = !!(window.swarm && typeof window.swarm.request === 'function')
  const walletAvailable = !!(window.ethereum && typeof window.ethereum.request === 'function')
  auth.setSwarmDetected(swarmAvailable)

  if (walletAvailable) {
    window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
      if (accounts?.length > 0) {
        auth.setWallet(accounts[0])
      }
    }).catch(() => {})
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
