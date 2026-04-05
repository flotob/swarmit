// Reference helpers live in swarmit-protocol. This file re-exports the
// canonical helpers and keeps one UI-specific helper (bzzToGatewayUrl)
// local to the Vue app.

export {
  refToHex,
  hexToBzz,
  isValidRef,
  isValidBzzRef,
  hexToBytes32,
  bytes32ToHex,
  refToBytes32,
  bytes32ToRef,
  slugToBoardId,
} from 'swarmit-protocol';

/**
 * Convert a bzz:// reference to a gateway-relative URL for rendering.
 * Used by components that display Swarm content via the local gateway.
 * @param {string} bzzRef - 'bzz://<64hex>' reference
 * @returns {string} '/bzz/<64hex>/' gateway path, or the input unchanged if not a bzz:// ref
 */
export function bzzToGatewayUrl(bzzRef) {
  if (!bzzRef || typeof bzzRef !== 'string' || !bzzRef.startsWith('bzz://')) return bzzRef;
  return `/bzz/${bzzRef.slice(6)}/`;
}
