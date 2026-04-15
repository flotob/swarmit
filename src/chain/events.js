/**
 * Read chain events via rpc.js (no wallet needed).
 * All public functions accept human-readable slugs where applicable
 * and handle the slug→bytes32 boundary internally.
 */

import { getLogs } from '../lib/rpc.js';
import { iface, TOPICS } from 'swarmit-protocol/chain';
import { CONTRACT_ADDRESS, CONTRACT_DEPLOY_BLOCK, isZeroBytes32, assertContractConfigured, contractRead } from './contract.js';
import { slugToBoardId, bytes32ToRef, refToBytes32 } from '../protocol/references.js';

/**
 * Decode a raw log using the contract ABI.
 */
function decodeLog(log) {
  return iface.parseLog({ topics: log.topics, data: log.data });
}

/**
 * Convert a submission-related bytes32 to bzz:// ref, or null if zero sentinel.
 */
function submissionBytes32ToRef(val) {
  if (isZeroBytes32(val)) return null;
  return bytes32ToRef(val);
}

// ============================================
// Board events
// ============================================

/**
 * Get all BoardRegistered events.
 * @param {{ fromBlock?: string }} [opts]
 * @returns {Promise<Array<{ boardId: string, slug: string, boardRef: string, governance: string, blockNumber: string }>>}
 *   boardId is raw bytes32 (keccak256 of slug, NOT a Swarm ref)
 */
export async function getBoardRegistrations(opts = {}) {
  assertContractConfigured();
  const logs = await getLogs({
    address: CONTRACT_ADDRESS,
    topics: [TOPICS.BoardRegistered],
    fromBlock: opts.fromBlock || CONTRACT_DEPLOY_BLOCK,
  });

  return logs.map((log) => {
    const parsed = decodeLog(log);
    return {
      boardId: parsed.args.boardId,
      slug: parsed.args.slug,
      boardRef: parsed.args.boardRef,
      governance: parsed.args.governance,
      blockNumber: log.blockNumber,
    };
  });
}

/**
 * Get BoardMetadataUpdated events, optionally filtered by board slug.
 * @param {string} [slug] - If provided, filter by this board's ID
 * @param {{ fromBlock?: string }} [opts]
 * @returns {Promise<Array<{ boardId: string, boardRef: string, blockNumber: string }>>}
 */
export async function getBoardMetadataUpdates(slug, opts = {}) {
  assertContractConfigured();
  const topics = [TOPICS.BoardMetadataUpdated];
  if (slug) {
    topics.push(slugToBoardId(slug));
  }

  const logs = await getLogs({
    address: CONTRACT_ADDRESS,
    topics,
    fromBlock: opts.fromBlock || CONTRACT_DEPLOY_BLOCK,
  });

  return logs.map((log) => {
    const parsed = decodeLog(log);
    return {
      boardId: parsed.args.boardId,
      boardRef: parsed.args.boardRef,
      blockNumber: log.blockNumber,
    };
  });
}

/**
 * Get the latest board metadata ref by folding BoardRegistered + BoardMetadataUpdated.
 * Returns the boardRef from the most recent event for this board.
 * @param {string} slug
 * @returns {Promise<{ boardRef: string, governance: string } | null>}
 */
export async function getLatestBoardMetadata(slug) {
  assertContractConfigured();
  const boardIdBytes32 = slugToBoardId(slug);

  const [registrations, updates] = await Promise.all([
    getLogs({
      address: CONTRACT_ADDRESS,
      topics: [TOPICS.BoardRegistered, boardIdBytes32],
      fromBlock: CONTRACT_DEPLOY_BLOCK,
    }),
    getLogs({
      address: CONTRACT_ADDRESS,
      topics: [TOPICS.BoardMetadataUpdated, boardIdBytes32],
      fromBlock: CONTRACT_DEPLOY_BLOCK,
    }),
  ]);

  if (registrations.length === 0) return null;

  // Get governance from the registration event
  const regParsed = decodeLog(registrations[0]);
  const governance = regParsed.args.governance;

  // The latest boardRef is from the most recent event (registration or update)
  const allLogs = [...registrations, ...updates].sort((a, b) => {
    const blockDiff = parseInt(a.blockNumber, 16) - parseInt(b.blockNumber, 16);
    if (blockDiff !== 0) return blockDiff;
    return parseInt(a.logIndex, 16) - parseInt(b.logIndex, 16);
  });

  const lastParsed = decodeLog(allLogs[allLogs.length - 1]);
  return {
    boardRef: lastParsed.args.boardRef,
    governance,
  };
}

// ============================================
// Submission events
// ============================================

/**
 * Get SubmissionAnnounced events for a board.
 * @param {string} slug - Human-readable board slug
 * @param {{ fromBlock?: string }} [opts]
 * @returns {Promise<Array>} Decoded submission events
 *   submissionId, parentSubmissionId, rootSubmissionId are bzz:// refs (null if zero)
 */
export async function getSubmissionsForBoard(slug, opts = {}) {
  assertContractConfigured();
  const logs = await getLogs({
    address: CONTRACT_ADDRESS,
    topics: [TOPICS.SubmissionAnnounced, slugToBoardId(slug)],
    fromBlock: opts.fromBlock || CONTRACT_DEPLOY_BLOCK,
  });

  return logs.map((log) => {
    const parsed = decodeLog(log);
    return {
      boardId: parsed.args.boardId,
      submissionRef: bytes32ToRef(parsed.args.submissionId),
      submissionIdBytes32: parsed.args.submissionId,
      parentSubmissionId: submissionBytes32ToRef(parsed.args.parentSubmissionId),
      rootSubmissionId: submissionBytes32ToRef(parsed.args.rootSubmissionId),
      author: parsed.args.author,
      blockNumber: log.blockNumber,
    };
  });
}

// ============================================
// Curator events
// ============================================

/**
 * Get all CuratorDeclared events.
 * @param {{ fromBlock?: string }} [opts]
 * @returns {Promise<Array<{ curator: string, curatorProfileRef: string, blockNumber: string }>>}
 */
export async function getCuratorDeclarations(opts = {}) {
  assertContractConfigured();
  const logs = await getLogs({
    address: CONTRACT_ADDRESS,
    topics: [TOPICS.CuratorDeclared],
    fromBlock: opts.fromBlock || CONTRACT_DEPLOY_BLOCK,
  });

  return logs.map((log) => {
    const parsed = decodeLog(log);
    return {
      curator: parsed.args.curator,
      curatorProfileRef: parsed.args.curatorProfileRef,
      blockNumber: log.blockNumber,
    };
  });
}

// ============================================
// User feed events + reads
// ============================================

/**
 * Get all UserFeedDeclared events for a user address.
 * @param {string} userAddress
 * @param {{ fromBlock?: string }} [opts]
 * @returns {Promise<Array<{ feedId: string, feedTopic: string, feedOwner: string, blockNumber: string }>>}
 */
export async function getUserFeedDeclarations(userAddress, opts = {}) {
  assertContractConfigured();
  const paddedAddress = '0x' + userAddress.slice(2).toLowerCase().padStart(64, '0');
  const logs = await getLogs({
    address: CONTRACT_ADDRESS,
    topics: [TOPICS.UserFeedDeclared, paddedAddress],
    fromBlock: opts.fromBlock || CONTRACT_DEPLOY_BLOCK,
  });
  return logs.map((log) => {
    const parsed = decodeLog(log);
    return {
      feedId: parsed.args.feedId,
      feedTopic: parsed.args.feedTopic,
      feedOwner: parsed.args.feedOwner,
      blockNumber: log.blockNumber,
    };
  });
}

/**
 * Read user feeds via the contract view function userFeedsOf().
 * Returns array of { feedId, feedTopic, feedOwner }.
 * @param {string} userAddress
 * @returns {Promise<Array<{ feedId: string, feedTopic: string, feedOwner: string }>>}
 */
export async function getUserFeeds(userAddress) {
  const result = await contractRead('userFeedsOf', [userAddress]);
  return result[0].map((entry) => ({
    feedId: entry.feedId,
    feedTopic: entry.feedTopic,
    feedOwner: entry.feedOwner,
  }));
}

/**
 * Check if a user has declared a specific feed.
 * @param {string} userAddress
 * @param {string} feedId - 0x-prefixed bytes32
 * @returns {Promise<boolean>}
 */
export async function hasUserFeed(userAddress, feedId) {
  const result = await contractRead('hasUserFeed', [userAddress, feedId]);
  return result[0];
}

// ============================================
// Vote reads (direct contract calls, no wallet)
// ============================================

/**
 * Get a specific voter's current vote for a submission.
 * @param {string} submissionRef - bzz:// ref or hex string
 * @param {string} voterAddress - Ethereum address
 * @returns {Promise<number>} -1, 0, or 1
 */
export async function getUserVote(submissionRef, voterAddress) {
  const [direction] = await contractRead('voteOf', [refToBytes32(submissionRef), voterAddress]);
  return Number(direction);
}
