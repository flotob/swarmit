import { useAuthStore } from '../stores/auth'
import { CHAIN_ID, CHAIN_ID_HEX } from '../config'

/**
 * Wallet composable — single source of truth for wallet connection.
 * Wraps window.ethereum and writes to Pinia.
 */
export function useWallet() {
  const auth = useAuthStore()

  async function connect() {
    if (!window.ethereum?.request) {
      throw new Error('Wallet provider not available')
    }

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
    if (!accounts?.length) throw new Error('No accounts returned')

    // Switch to Gnosis Chain before marking as connected
    await ensureGnosisChain()

    auth.setWallet(accounts[0])
    return accounts[0]
  }

  async function ensureGnosisChain() {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' })
    if (parseInt(chainId, 16) === CHAIN_ID) return

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
      } else {
        throw err
      }
    }
  }

  function isAvailable() {
    return !!(window.ethereum && typeof window.ethereum.request === 'function')
  }

  return { connect, ensureGnosisChain, isAvailable }
}
