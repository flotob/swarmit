<script setup>
import { useAuthStore } from '../stores/auth'
import { CHAIN_ID_HEX } from '../config'

const auth = useAuthStore()

async function connectWallet() {
  if (!window.ethereum) return
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
    if (accounts?.length > 0) {
      auth.setWallet(accounts[0])
      // Switch to Gnosis Chain
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: CHAIN_ID_HEX }],
        })
      } catch (err) {
        if (err.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: CHAIN_ID_HEX,
              chainName: 'Gnosis Chain',
              nativeCurrency: { name: 'xDAI', symbol: 'xDAI', decimals: 18 },
              rpcUrls: ['https://rpc.gnosischain.com'],
              blockExplorerUrls: ['https://gnosisscan.io'],
            }],
          })
        }
      }
    }
  } catch (err) {
    console.error('Wallet connect failed:', err)
  }
}

function truncateAddress(addr) {
  if (!addr || addr.length < 10) return addr || ''
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}
</script>

<template>
  <header class="sticky top-0 z-50 bg-gray-900 border-b border-gray-800">
    <div class="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
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
