import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const walletConnected = ref(false)
  const userAddress = ref(null)
  const userFeedTopic = ref(null)
  const userFeedOwner = ref(null)
  const userFeedDeclared = ref(false)
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

  function setUserFeedTopic(topic) {
    userFeedTopic.value = topic
  }

  function setUserFeedOwner(owner) {
    userFeedOwner.value = owner
  }

  return {
    walletConnected, userAddress, userFeedTopic, userFeedOwner, userFeedDeclared,
    swarmDetected, swarmConnected,
    setWallet, clearWallet,
    setSwarmDetected, setSwarmConnected, setUserFeedTopic, setUserFeedOwner,
  }
})
