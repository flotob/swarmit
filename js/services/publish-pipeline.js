/**
 * Author publish pipeline — the multi-step flow for publishing posts and replies.
 * App/service layer: mixes state, Swarm writes, feed mutation, and chain txs.
 * Not part of the pure protocol layer.
 */

import * as state from '../state.js';
import { publishJSON, createFeed, updateFeed, connect as connectSwarm, isAvailable as isSwarmAvailable } from '../lib/swarm.js';
import { connect as connectWallet, isAvailable as isWalletAvailable } from '../lib/ethereum.js';
import { FREEDOM_ADAPTER } from '../config.js';
import { hexToBzz } from '../protocol/references.js';
import { validate, validateUserFeedIndex, buildPost, buildReply, buildSubmission, buildUserFeedIndex } from '../protocol/objects.js';
import { resolveFeed } from '../swarm/feeds.js';
import { announceSubmission } from '../chain/transactions.js';
import { isContractConfigured } from '../chain/contract.js';

// Mutex to prevent concurrent pipeline executions (protects feed index read-modify-write)
let pipelineLock = false;

// Step name constants — views import these instead of maintaining their own copies
export const POST_STEPS = ['Ensure identity', 'Publish post', 'Publish submission', 'Update user feed', 'Announce on-chain'];
export const REPLY_STEPS = ['Ensure identity', 'Publish reply', 'Publish submission', 'Update user feed', 'Announce on-chain'];

/**
 * Ensure user feed exists and return the stable manifest bzzUrl.
 * Idempotent: createFeed with the same name returns the same feed.
 */
export async function ensureUserFeed(onStatus) {
  const existing = state.get().userFeed;
  if (existing) {
    onStatus?.('User feed already known');
    return existing;
  }

  onStatus?.('Creating user feed...');
  const result = await createFeed(FREEDOM_ADAPTER.USER_FEED_NAME);
  const bzzUrl = result.bzzUrl || hexToBzz(result.manifestReference);

  state.update({ userFeed: bzzUrl });
  onStatus?.(`User feed: ${bzzUrl}`);
  return bzzUrl;
}

/**
 * Ensure wallet and Swarm are connected. Returns the wallet address.
 * Does NOT create/check user feed — use ensureIdentity() for the full author flow.
 */
export async function ensureProviders(onStatus) {
  if (!isWalletAvailable()) throw new Error('Wallet provider not available');
  if (!isSwarmAvailable()) throw new Error('Swarm provider not available');

  if (!state.get().walletConnected) {
    onStatus?.('Connecting wallet...');
    await connectWallet();
  }

  if (!state.get().swarmConnected) {
    onStatus?.('Connecting to Swarm...');
    await connectSwarm();
  }

  const userAddress = state.get().userAddress;
  if (!userAddress) throw new Error('No wallet address after connect');
  return userAddress;
}

/**
 * Ensure wallet, Swarm, and user feed are ready. Full author identity flow.
 */
export async function ensureIdentity(onStatus) {
  const userAddress = await ensureProviders(onStatus);
  const userFeed = await ensureUserFeed(onStatus);
  return { userAddress, userFeed };
}

/**
 * Build, validate, and publish a protocol object.
 */
export async function publishValidated(obj, label) {
  const result = validate(obj);
  if (!result.valid) {
    throw new Error(`${label} validation failed: ${result.errors.join(', ')}`);
  }
  return publishJSON(obj, label);
}

/**
 * Read the current userFeedIndex from the user's feed.
 * Returns null only for genuinely empty/new feeds (404). Throws on malformed content
 * or transient errors to prevent overwriting an existing index from an empty baseline.
 */
async function readCurrentUserFeedIndex(userFeed) {
  let index;
  try {
    index = await resolveFeed(userFeed);
  } catch (err) {
    // Only 404 means "no index yet". Any other status (500, timeout, etc.) is a real error.
    if (err.message.includes('404')) {
      return null;
    }
    throw new Error(`Cannot read user feed — refusing to overwrite: ${err.message}`);
  }

  if (!index) return null;

  const errors = validateUserFeedIndex(index);
  if (errors.length > 0) {
    throw new Error(`User feed contains invalid userFeedIndex: ${errors.join(', ')}`);
  }
  return index;
}

/**
 * Shared pipeline core — used by both publishPost and publishReply.
 */
async function runPipeline({ boardSlug, kind, contentBuilderFn, contentLabel, submissionExtras, chainAnnounceExtras, onStep }) {
  if (pipelineLock) throw new Error('A publish is already in progress');
  pipelineLock = true;

  const step = (name, status, detail) => onStep?.(name, status, detail);

  try {
    // Step 1: Identity
    step('Ensure identity', 'active');
    const { userAddress, userFeed } = await ensureIdentity((msg) => step('Ensure identity', 'active', msg));
    const author = { address: userAddress, userFeed };
    step('Ensure identity', 'done', userAddress);

    // Step 2: Build + publish content (post or reply)
    step(contentLabel, 'active');
    const content = contentBuilderFn(author);
    const contentResult = await publishValidated(content, kind);
    step(contentLabel, 'done', contentResult.bzzUrl);

    // Step 3: Build + publish submission
    step('Publish submission', 'active');
    const submission = buildSubmission({
      boardId: boardSlug,
      kind,
      contentRef: contentResult.bzzUrl,
      author,
      ...submissionExtras,
    });
    const subResult = await publishValidated(submission, 'submission');
    step('Publish submission', 'done', subResult.bzzUrl);

    // Step 4: Update user feed index
    step('Update user feed', 'active');
    const currentIndex = await readCurrentUserFeedIndex(userFeed);
    const entries = currentIndex ? [...currentIndex.entries] : [];
    entries.push({
      submissionId: subResult.bzzUrl,
      submissionRef: subResult.bzzUrl,
      boardId: boardSlug,
      kind,
      createdAt: submission.createdAt,
    });
    const newIndex = buildUserFeedIndex({ author: userAddress, entries });
    const indexResult = await publishValidated(newIndex, 'userFeedIndex');
    await updateFeed(FREEDOM_ADAPTER.USER_FEED_NAME, indexResult.reference);
    step('Update user feed', 'done', `${entries.length} entries`);

    // Step 5: Announce on-chain
    let announced = false;
    if (isContractConfigured()) {
      step('Announce on-chain', 'active');
      try {
        const tx = await announceSubmission({
          boardSlug,
          submissionRef: subResult.bzzUrl,
          ...chainAnnounceExtras,
        });
        step('Announce on-chain', 'done', `tx: ${tx}`);
        announced = true;
      } catch (err) {
        step('Announce on-chain', 'error', err.message);
      }
    } else {
      step('Announce on-chain', 'skipped', 'Contract not configured');
    }

    return {
      contentRef: contentResult.bzzUrl,
      submissionRef: subResult.bzzUrl,
      userFeedIndexRef: indexResult.bzzUrl,
      announced,
    };
  } finally {
    pipelineLock = false;
  }
}

/**
 * Publish a post and run the full pipeline.
 */
export async function publishPost({ boardSlug, title, bodyText, onStep }) {
  return runPipeline({
    boardSlug,
    kind: 'post',
    contentLabel: 'Publish post',
    contentBuilderFn: (author) => buildPost({ author, title, body: { kind: 'markdown', text: bodyText } }),
    submissionExtras: {},
    chainAnnounceExtras: { parentSubmissionId: null, rootSubmissionId: null },
    onStep,
  });
}

/**
 * Publish a reply and run the full pipeline.
 */
export async function publishReply({ boardSlug, bodyText, parentSubmissionId, rootSubmissionId, onStep }) {
  return runPipeline({
    boardSlug,
    kind: 'reply',
    contentLabel: 'Publish reply',
    contentBuilderFn: (author) => buildReply({ author, body: { kind: 'markdown', text: bodyText } }),
    submissionExtras: { parentSubmissionId, rootSubmissionId },
    chainAnnounceExtras: { parentSubmissionId, rootSubmissionId },
    onStep,
  });
}
