/**
 * Build and send transactions via ethereum.js (wallet needed).
 * All public functions accept human-readable slugs and bzz:// refs.
 * Calldata encoding is delegated to swarmit-protocol/chain; this file
 * just adds the Vue-app signer wiring (sendTransaction via window.ethereum).
 *
 * NOTE: the public param names here (parentSubmissionId, rootSubmissionId)
 * are Vue-app-legacy — they actually carry bzz:// refs, not on-chain IDs.
 * The library's encode.announceSubmission uses the more accurate *Ref
 * naming; the mapping happens at the library call site below.
 */

import { sendTransaction } from '../lib/ethereum.js';
import { CONTRACT_ADDRESS, assertContractConfigured } from './contract.js';
import { encode } from 'swarmit-protocol/chain';

/**
 * Encode a calldata payload via the library and send it to the contract.
 */
async function sendCalldata(data) {
  assertContractConfigured();
  return sendTransaction({ to: CONTRACT_ADDRESS, data });
}

/**
 * Register a new board.
 * @param {string} slug - Human-readable board slug
 * @param {string} boardRef - bzz:// reference to the immutable board metadata object
 * @returns {Promise<string>} Transaction hash
 */
export async function registerBoard(slug, boardRef) {
  return sendCalldata(encode.registerBoard({ slug, boardRef }));
}

/**
 * Update board metadata.
 * @param {string} slug - Human-readable board slug
 * @param {string} boardRef - bzz:// reference to the new board metadata object
 * @returns {Promise<string>} Transaction hash
 */
export async function updateBoardMetadata(slug, boardRef) {
  return sendCalldata(encode.updateBoardMetadata({ slug, boardRef }));
}

/**
 * Announce a submission (post or reply).
 * @param {Object} params
 * @param {string} params.boardSlug - Human-readable board slug
 * @param {string} params.submissionRef - bzz:// reference to the submission object
 * @param {string|null} params.parentSubmissionId - bzz:// ref of parent submission, or null for top-level posts
 * @param {string|null} params.rootSubmissionId - bzz:// ref of root submission, or null for top-level posts
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
 * @param {string} params.submissionRef - bzz:// reference or hex string identifying the submission
 * @param {number} params.direction - 1 (upvote), -1 (downvote), or 0 (clear)
 * @returns {Promise<string>} Transaction hash
 */
export async function setVote({ submissionRef, direction }) {
  return sendCalldata(encode.setVote({ submissionRef, direction }));
}

/**
 * Declare (or refresh) a curator profile.
 * @param {string} curatorProfileRef - bzz:// reference to the curatorProfile object
 * @returns {Promise<string>} Transaction hash
 */
export async function declareCurator(curatorProfileRef) {
  return sendCalldata(encode.declareCurator({ curatorProfileRef }));
}
