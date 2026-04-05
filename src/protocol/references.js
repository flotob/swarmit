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
 * Convert a bzz:// reference to a gateway-relative URL for rendering.
 * @param {string} bzzRef - 'bzz://<64hex>' reference
 * @returns {string} '/bzz/<64hex>/' gateway path, or the input unchanged if not a bzz:// ref
 */
export function bzzToGatewayUrl(bzzRef) {
  if (!bzzRef || typeof bzzRef !== 'string' || !bzzRef.startsWith('bzz://')) return bzzRef;
  return `/bzz/${bzzRef.slice(6)}/`;
}
