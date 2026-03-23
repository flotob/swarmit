/**
 * Ethereum wallet provider wrapper.
 * Only module that touches window.ethereum directly.
 * Used only for account access, chain switching, and signed transactions.
 * Chain reads go through rpc.js instead.
 */

import * as state from '../state.js';
import { CHAIN_ID, CHAIN_ID_HEX } from '../config.js';

/**
 * Check if the wallet provider is available.
 */
export function isAvailable() {
  return !!(window.ethereum && typeof window.ethereum.request === 'function');
}

/**
 * Connect wallet — request accounts.
 * @returns {Promise<string>} The connected address
 */
export async function connect() {
  if (!isAvailable()) throw new Error('Wallet provider not available');

  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts returned');
  }

  const address = accounts[0];
  state.update({ walletConnected: true, userAddress: address });

  // Listen for account changes
  window.ethereum.on('accountsChanged', (accs) => {
    if (accs.length === 0) {
      state.update({ walletConnected: false, userAddress: null });
    } else {
      state.update({ userAddress: accs[0] });
    }
  });

  // Ensure we're on Gnosis Chain
  await ensureGnosisChain();

  return address;
}

/**
 * Get the currently connected accounts (without prompting).
 * @returns {Promise<string[]>}
 */
export async function getAccounts() {
  if (!isAvailable()) return [];
  return window.ethereum.request({ method: 'eth_accounts' });
}

/**
 * Get the current chain ID.
 * @returns {Promise<string>} Hex chain ID
 */
export async function getChainId() {
  if (!isAvailable()) return null;
  return window.ethereum.request({ method: 'eth_chainId' });
}

/**
 * Switch to Gnosis Chain. If the chain isn't added, attempt to add it.
 */
export async function ensureGnosisChain() {
  if (!isAvailable()) return;

  const currentChainId = await getChainId();
  if (parseInt(currentChainId, 16) === CHAIN_ID) return;

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CHAIN_ID_HEX }],
    });
  } catch (err) {
    // 4902 = chain not added
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
      });
    } else {
      throw err;
    }
  }
}

/**
 * Send a transaction via the wallet.
 * @param {{ to: string, data: string, value?: string }} tx
 * @returns {Promise<string>} Transaction hash
 */
export async function sendTransaction(tx) {
  if (!isAvailable()) throw new Error('Wallet provider not available');

  const accounts = await getAccounts();
  if (!accounts || accounts.length === 0) {
    throw new Error('Wallet not connected');
  }

  await ensureGnosisChain();

  return window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{
      from: accounts[0],
      to: tx.to,
      data: tx.data,
      value: tx.value || '0x0',
    }],
  });
}
