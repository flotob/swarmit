/**
 * Build and send transactions via ethereum.js (wallet needed).
 * All public functions accept human-readable slugs and bzz:// refs.
 * The slug→bytes32 and ref→bytes32 boundaries are handled internally.
 */

import { sendTransaction } from '../lib/ethereum.js';
import { CONTRACT_ADDRESS, iface, BYTES32_ZERO, assertContractConfigured } from './contract.js';
import { slugToBoardId, refToBytes32 } from '../protocol/references.js';

/**
 * Encode a function call and send it to the contract.
 */
async function send(functionName, args) {
  assertContractConfigured();
  const data = iface.encodeFunctionData(functionName, args);
  return sendTransaction({ to: CONTRACT_ADDRESS, data });
}

/**
 * Register a new board.
 * @param {string} slug - Human-readable board slug
 * @param {string} boardRef - bzz:// reference to the immutable board metadata object
 * @returns {Promise<string>} Transaction hash
 */
export async function registerBoard(slug, boardRef) {
  const boardId = slugToBoardId(slug);
  return send('registerBoard', [boardId, slug, boardRef]);
}

/**
 * Update board metadata.
 * @param {string} slug - Human-readable board slug
 * @param {string} boardRef - bzz:// reference to the new board metadata object
 * @returns {Promise<string>} Transaction hash
 */
export async function updateBoardMetadata(slug, boardRef) {
  const boardId = slugToBoardId(slug);
  return send('updateBoardMetadata', [boardId, boardRef]);
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
  if (!parentSubmissionId !== !rootSubmissionId) {
    throw new Error('parentSubmissionId and rootSubmissionId must both be null (top-level post) or both be non-null (reply)');
  }

  const boardId = slugToBoardId(boardSlug);
  const submissionId = refToBytes32(submissionRef);

  // For top-level posts: parent is zero, root equals self
  const parentBytes32 = parentSubmissionId ? refToBytes32(parentSubmissionId) : BYTES32_ZERO;
  const rootBytes32 = rootSubmissionId ? refToBytes32(rootSubmissionId) : submissionId;

  return send('announceSubmission', [boardId, submissionId, submissionRef, parentBytes32, rootBytes32]);
}

/**
 * Declare (or refresh) a curator profile.
 * @param {string} curatorProfileRef - bzz:// reference to the curatorProfile object
 * @returns {Promise<string>} Transaction hash
 */
export async function declareCurator(curatorProfileRef) {
  return send('declareCurator', [curatorProfileRef]);
}
