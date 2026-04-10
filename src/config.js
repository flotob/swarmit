/**
 * Swarmit configuration constants.
 * Deployment-specific values are read from VITE_* env vars (see .env).
 */

// Chain
export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 100);
export const CHAIN_ID_HEX = '0x' + CHAIN_ID.toString(16);
export const GNOSIS_RPC_URL = import.meta.env.VITE_RPC_URL || 'https://rpc.gnosischain.com';

// Contract
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x7a2D98B5e8BA54Ed82Dd1159fCCBB50b7e5b71B1';
export const CONTRACT_DEPLOY_BLOCK = import.meta.env.VITE_CONTRACT_DEPLOY_BLOCK || '0x2b5bae7';

// Default curators (comma-separated bzz:// profile feed refs from env)
export const DEFAULT_CURATORS = (import.meta.env.VITE_DEFAULT_CURATORS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// SwarmitUsernameRegistry (optional — if unset, the app degrades to fallback names)
export const USERNAME_REGISTRY_ADDRESS = import.meta.env.VITE_USERNAME_REGISTRY_ADDRESS || '';
export const USERNAME_REGISTRY_DEPLOY_BLOCK = import.meta.env.VITE_USERNAME_REGISTRY_DEPLOY_BLOCK || '';
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
