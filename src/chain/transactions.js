/**
 * Build and send transactions via ethereum.js (wallet needed).
 * Calldata encoding is delegated to swarmit-protocol/chain.
 *
 * NOTE: the public param names parentSubmissionId/rootSubmissionId on
 * announceSubmission are Vue-app-legacy — they actually carry bzz:// refs,
 * not on-chain bytes32 IDs. The library uses the more accurate *Ref naming;
 * the translation happens at the library call site below. Do not rename
 * without auditing all callers.
 */

import { sendTransaction } from '../lib/ethereum.js';
import { CONTRACT_ADDRESS, assertContractConfigured } from './contract.js';
import { encode } from 'swarmit-protocol/chain';

/** Send pre-encoded calldata to the configured contract. */
async function sendCalldata(data) {
  assertContractConfigured();
  return sendTransaction({ to: CONTRACT_ADDRESS, data });
}

/** Register a new board. @returns {Promise<string>} tx hash */
export async function registerBoard(slug, boardRef) {
  return sendCalldata(encode.registerBoard({ slug, boardRef }));
}

/** Update board metadata (only callable by governance). @returns {Promise<string>} tx hash */
export async function updateBoardMetadata(slug, boardRef) {
  return sendCalldata(encode.updateBoardMetadata({ slug, boardRef }));
}

/**
 * Announce a submission (post or reply).
 * @param {Object} params
 * @param {string} params.boardSlug - Human-readable board slug
 * @param {string} params.submissionRef - bzz:// reference to the submission object
 * @param {string|null} params.parentSubmissionId - bzz:// ref (legacy Vue name; library calls this parentSubmissionRef). Null for top-level posts.
 * @param {string|null} params.rootSubmissionId - bzz:// ref (legacy Vue name; library calls this rootSubmissionRef). Null for top-level posts.
 * @returns {Promise<string>} Transaction hash
 */
export async function announceSubmission({ boardSlug, submissionRef, parentSubmissionId, rootSubmissionId }) {
  const data = encode.announceSubmission({
    boardSlug,
    submissionRef,
    parentSubmissionRef: parentSubmissionId,
    rootSubmissionRef: rootSubmissionId,
  });
  return sendCalldata(data);
}

/**
 * Set, flip, or clear a vote on a submission.
 * @param {Object} params
 * @param {string} params.submissionRef - bzz:// reference or hex string
 * @param {number} params.direction - 1 (upvote), -1 (downvote), 0 (clear)
 * @returns {Promise<string>} Transaction hash
 */
export async function setVote({ submissionRef, direction }) {
  return sendCalldata(encode.setVote({ submissionRef, direction }));
}

/** Declare (or refresh) a curator profile. @returns {Promise<string>} tx hash */
export async function declareCurator(curatorProfileRef) {
  return sendCalldata(encode.declareCurator({ curatorProfileRef }));
}
