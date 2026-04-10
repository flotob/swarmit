/**
 * Batched vote reads via Multicall3.
 * Used by the votes store to hydrate feed/thread vote state in one RPC call.
 *
 * Per-submission legacy path lives in src/chain/events.js (getVoteTotals,
 * getUserVote) — kept as a fallback for one-off reads after wallet connect.
 */

import { iface } from 'swarmit-protocol/chain';
import { refToBytes32 } from '../protocol/references.js';
import { CONTRACT_ADDRESS, isContractConfigured } from './contract.js';
import { multicallAggregate, decodeResult, chunk, dedupeByLowercase, MAX_BATCH_SIZE } from './multicall.js';

/**
 * Batch-fetch vote totals and (optionally) the caller's current vote for
 * many submissions via Multicall3.
 *
 * Deduplicates refs case-insensitively. Chunks across multiple aggregate3
 * calls if the inner call count exceeds MAX_BATCH_SIZE. Missing/failed
 * lookups are mapped to zero.
 *
 * @param {string[]} submissionRefs - bzz:// refs or hex strings
 * @param {string} [voter] - optional EVM address to fetch voteOf for each ref
 * @returns {Promise<{ totals: Map<string, {upvotes: number, downvotes: number}>, myVotes: Map<string, number> }>}
 */
export async function getVotesBatch(submissionRefs, voter) {
  const totals = new Map();
  const myVotes = new Map();
  if (!isContractConfigured() || !submissionRefs?.length) return { totals, myVotes };

  const unique = dedupeByLowercase(submissionRefs);
  if (!unique.size) return { totals, myVotes };

  const entries = [...unique.entries()];
  // Each ref produces 2 calls (upvote + downvote) without voter, or 3 (+ voteOf) with.
  // e.g. MAX_BATCH_SIZE=250, voter=true → callsPerRef=3 → refsPerChunk=83 → 249 calls/chunk
  const callsPerRef = voter ? 3 : 2;
  const refsPerChunk = Math.floor(MAX_BATCH_SIZE / callsPerRef);

  const chunkResults = await Promise.all(
    chunk(entries, refsPerChunk).map((c) => fetchChunk(c, voter)),
  );

  for (const { totals: t, myVotes: m } of chunkResults) {
    for (const [k, v] of t) totals.set(k, v);
    for (const [k, v] of m) myVotes.set(k, v);
  }

  return { totals, myVotes };
}

function registryCall(fnName, args) {
  return {
    target: CONTRACT_ADDRESS,
    allowFailure: true,
    callData: iface.encodeFunctionData(fnName, args),
  };
}

function decodeNumber(result, fnName) {
  const decoded = decodeResult(result, fnName, iface);
  return decoded ? Number(decoded[0]) : 0;
}

/**
 * Encode one chunk of entries into a single aggregate3 call.
 * Each entry contributes upvoteCount + downvoteCount + (optional) voteOf.
 */
async function fetchChunk(entries, voter) {
  const wantMyVote = !!voter;
  const calls = [];
  for (const [, ref] of entries) {
    const id = refToBytes32(ref);
    calls.push(registryCall('upvoteCount', [id]));
    calls.push(registryCall('downvoteCount', [id]));
    if (wantMyVote) calls.push(registryCall('voteOf', [id, voter]));
  }

  const results = await multicallAggregate(calls);
  const totals = new Map();
  const myVotes = new Map();
  const stride = wantMyVote ? 3 : 2;

  for (let i = 0; i < entries.length; i++) {
    const key = entries[i][0];
    const base = i * stride;
    totals.set(key, {
      upvotes: decodeNumber(results[base], 'upvoteCount'),
      downvotes: decodeNumber(results[base + 1], 'downvoteCount'),
    });
    if (wantMyVote) {
      myVotes.set(key, decodeNumber(results[base + 2], 'voteOf'))
    }
  }

  return { totals, myVotes };
}
