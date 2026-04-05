/**
 * Swarmit configuration constants.
 */

// Gnosis Chain
export const CHAIN_ID = 100;
export const CHAIN_ID_HEX = '0x64';
export const GNOSIS_RPC_URL = 'https://rpc.gnosischain.com';

// Contract — SwarmitRegistryV2 deployed on Gnosis Chain
export const CONTRACT_ADDRESS = '0x7a2D98B5e8BA54Ed82Dd1159fCCBB50b7e5b71B1';
export const CONTRACT_DEPLOY_BLOCK = '0x2b5bae7'; // block 45464295

// Freedom Browser adapter conventions (not protocol-level)
// These are client implementation details for how this app uses
// Freedom's window.swarm feed API. Other clients may use different
// feed naming or topic derivation schemes.
export const FREEDOM_ADAPTER = {
  USER_FEED_NAME: 'user-feed',
};
