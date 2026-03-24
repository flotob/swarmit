/**
 * Swarmit configuration constants.
 */

// Gnosis Chain
export const CHAIN_ID = 100;
export const CHAIN_ID_HEX = '0x64';
export const GNOSIS_RPC_URL = 'https://rpc.gnosischain.com';

// Contract — deployed on Gnosis Chain
export const CONTRACT_ADDRESS = '0x34b27b9978E05B6EfD8AFEcc133C3b1fC5431613';
export const CONTRACT_DEPLOY_BLOCK = '0x2B3B1E6'; // block 45315302

// Protocol
export const PROTOCOL_VERSION = 'v1';
export const PROTOCOL_PREFIX = 'freedom-board';

// Protocol type identifiers
export const TYPES = {
  BOARD: `${PROTOCOL_PREFIX}/board/${PROTOCOL_VERSION}`,
  POST: `${PROTOCOL_PREFIX}/post/${PROTOCOL_VERSION}`,
  REPLY: `${PROTOCOL_PREFIX}/reply/${PROTOCOL_VERSION}`,
  SUBMISSION: `${PROTOCOL_PREFIX}/submission/${PROTOCOL_VERSION}`,
  USER_FEED: `${PROTOCOL_PREFIX}/user-feed/${PROTOCOL_VERSION}`,
  BOARD_INDEX: `${PROTOCOL_PREFIX}/board-index/${PROTOCOL_VERSION}`,
  THREAD_INDEX: `${PROTOCOL_PREFIX}/thread-index/${PROTOCOL_VERSION}`,
  GLOBAL_INDEX: `${PROTOCOL_PREFIX}/global-index/${PROTOCOL_VERSION}`,
  CURATOR: `${PROTOCOL_PREFIX}/curator/${PROTOCOL_VERSION}`,
};

// Freedom Browser adapter conventions (not protocol-level)
// These are client implementation details for how this app uses
// Freedom's window.swarm feed API. Other clients may use different
// feed naming or topic derivation schemes.
export const FREEDOM_ADAPTER = {
  USER_FEED_NAME: 'user-feed',
};
