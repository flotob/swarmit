/**
 * Swarmit configuration constants.
 * Deployment-specific values are read from VITE_* env vars (see .env).
 */

// Chain
export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 100);
export const CHAIN_ID_HEX = '0x' + CHAIN_ID.toString(16);
export const GNOSIS_RPC_URL = import.meta.env.VITE_RPC_URL || 'https://rpc.gnosischain.com';

// SwarmitRegistryV3 contract
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0xf759cD44a0d477E4e593468993ffbD935FD838bc';
// Normalized to 0x-prefixed hex for direct use in eth_getLogs fromBlock.
export const CONTRACT_DEPLOY_BLOCK = (() => {
  const raw = import.meta.env.VITE_CONTRACT_DEPLOY_BLOCK || '';
  if (!raw) return '0x0';
  return raw.startsWith('0x') ? raw : '0x' + Number(raw).toString(16);
})();

// Default curators (comma-separated bzz:// profile feed refs from env)
export const DEFAULT_CURATORS = (import.meta.env.VITE_DEFAULT_CURATORS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// SwarmitUsernameRegistry (optional — if unset, the app degrades to fallback names)
export const USERNAME_REGISTRY_ADDRESS = import.meta.env.VITE_USERNAME_REGISTRY_ADDRESS || '';
// Normalized to 0x-prefixed hex for direct use in eth_getLogs fromBlock.
export const USERNAME_REGISTRY_DEPLOY_BLOCK = (() => {
  const raw = import.meta.env.VITE_USERNAME_REGISTRY_DEPLOY_BLOCK || '';
  if (!raw) return '';
  return raw.startsWith('0x') ? raw : '0x' + Number(raw).toString(16);
})();
export const MULTICALL3_ADDRESS = import.meta.env.VITE_MULTICALL3_ADDRESS || '';

const ADDRESS_ZERO = '0x' + '0'.repeat(40);
export function isUsernameRegistryConfigured() {
  return !!(
    USERNAME_REGISTRY_ADDRESS &&
    USERNAME_REGISTRY_ADDRESS !== ADDRESS_ZERO &&
    MULTICALL3_ADDRESS &&
    MULTICALL3_ADDRESS !== ADDRESS_ZERO
  );
}

// Freedom Browser adapter conventions (not protocol-level)
// These are client implementation details for how this app uses
// Freedom's window.swarm feed API. Other clients may use different
// feed naming or topic derivation schemes.
export const FREEDOM_ADAPTER = {
  USER_FEED_NAME: 'user-feed',
};
