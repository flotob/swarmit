/**
 * Contract ABI fragments, event signatures, and address.
 */

import { Interface } from '../lib/ethers-utils.js';
import { CONTRACT_ADDRESS, CONTRACT_DEPLOY_BLOCK } from '../config.js';

export { CONTRACT_ADDRESS, CONTRACT_DEPLOY_BLOCK };

// Minimal ABI — only the events and functions we use
const ABI = [
  // Events
  'event BoardRegistered(bytes32 indexed boardId, string slug, string boardRef, address governance)',
  'event BoardMetadataUpdated(bytes32 indexed boardId, string boardRef)',
  'event SubmissionAnnounced(bytes32 indexed boardId, bytes32 indexed submissionId, string submissionRef, bytes32 parentSubmissionId, bytes32 rootSubmissionId, address author)',
  'event CuratorDeclared(address indexed curator, string curatorProfileRef)',

  // Write methods
  'function registerBoard(bytes32 boardId, string slug, string boardRef)',
  'function updateBoardMetadata(bytes32 boardId, string boardRef)',
  'function announceSubmission(bytes32 boardId, bytes32 submissionId, string submissionRef, bytes32 parentSubmissionId, bytes32 rootSubmissionId)',
  'function declareCurator(string curatorProfileRef)',
];

export const iface = new Interface(ABI);

// Pre-computed topic0 hashes for event filtering
export const TOPICS = {
  BoardRegistered: iface.getEvent('BoardRegistered').topicHash,
  BoardMetadataUpdated: iface.getEvent('BoardMetadataUpdated').topicHash,
  SubmissionAnnounced: iface.getEvent('SubmissionAnnounced').topicHash,
  CuratorDeclared: iface.getEvent('CuratorDeclared').topicHash,
};

const ADDRESS_ZERO = '0x' + '0'.repeat(40);
const BYTES32_ZERO = '0x' + '0'.repeat(64);

/**
 * Check if the contract address has been configured (not the placeholder).
 */
export function isContractConfigured() {
  return !!(CONTRACT_ADDRESS && CONTRACT_ADDRESS !== ADDRESS_ZERO);
}

/**
 * Throw if the contract address is still the placeholder.
 * Call this at the entry point of any read or write operation.
 */
export function assertContractConfigured() {
  if (!isContractConfigured()) {
    throw new Error('Contract address not configured — update CONTRACT_ADDRESS in config.js');
  }
}

/**
 * Check if a bytes32 value is the zero sentinel.
 */
export function isZeroBytes32(val) {
  return !val || val === BYTES32_ZERO;
}

export { BYTES32_ZERO };
