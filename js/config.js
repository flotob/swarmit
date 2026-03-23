/**
 * Swarmit configuration constants.
 */

// Gnosis Chain
export const CHAIN_ID = 100;
export const CHAIN_ID_HEX = '0x64';
export const GNOSIS_RPC_URL = 'https://rpc.gnosischain.com';

// Contract (placeholder — update after deployment)
export const CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000';

// Protocol
export const PROTOCOL_VERSION = 'v1';
export const PROTOCOL_PREFIX = 'freedom-board';
export const USER_FEED_NAME = 'user-feed';

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
