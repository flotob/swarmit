import { bzzFetchUrl } from '../lib/bee-gateway.js';

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
} from 'swarmit-protocol/references';

/**
 * Convert a bzz:// reference to a gateway URL for rendering.
 * In Freedom Browser this is a relative '/bzz/<hex>/' that the local
 * gateway proxies. Outside Freedom, it points at a public Swarm gateway.
 * @param {string} bzzRef - 'bzz://<64hex>' reference
 * @returns {string} gateway URL, or the input unchanged if not a bzz:// ref
 */
export function bzzToGatewayUrl(bzzRef) {
  if (!bzzRef || typeof bzzRef !== 'string' || !bzzRef.startsWith('bzz://')) return bzzRef;
  return bzzFetchUrl(bzzRef.slice(6));
}
