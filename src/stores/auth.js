import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const walletConnected = ref(false)
  const userAddress = ref(null)
  const userFeed = ref(null)
  const swarmDetected = ref(false)
  const swarmConnected = ref(false)

  function setWallet(address) {
    walletConnected.value = true
    userAddress.value = address
  }

  function clearWallet() {
    walletConnected.value = false
    userAddress.value = null
  }

  function setSwarmDetected(detected) {
    swarmDetected.value = detected
  }

  function setSwarmConnected(connected) {
    swarmConnected.value = connected
  }

  function setUserFeed(feed) {
    userFeed.value = feed
  }

  return {
    walletConnected, userAddress, userFeed,
    swarmDetected, swarmConnected,
    setWallet, clearWallet,
    setSwarmDetected, setSwarmConnected, setUserFeed,
  }
})
