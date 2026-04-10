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
import { multicallAggregate, decodeResult, chunk, MAX_BATCH_SIZE } from './multicall.js';

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

  // Dedupe by lowercase hex ref, preserve original ref for bytes32 encoding
  const unique = new Map();
  for (const ref of submissionRefs) {
    if (!ref) continue;
    const key = ref.toLowerCase();
    if (!unique.has(key)) unique.set(key, ref);
  }
  if (!unique.size) return { totals, myVotes };

  const entries = [...unique.entries()];
  const wantMyVote = !!voter;

  // Each ref produces 2 calls (upvote + downvote) or 3 (+ voteOf)
  const callsPerRef = wantMyVote ? 3 : 2;
  const refsPerChunk = Math.floor(MAX_BATCH_SIZE / callsPerRef);

  const chunkResults = await Promise.all(
    chunk(entries, refsPerChunk).map((c) => fetchChunk(c, voter, wantMyVote)),
  );

  for (const { totals: t, myVotes: m } of chunkResults) {
    for (const [k, v] of t) totals.set(k, v);
    for (const [k, v] of m) myVotes.set(k, v);
  }

  return { totals, myVotes };
}

/**
 * Encode one chunk of entries into a single aggregate3 call.
 * Each entry contributes upvoteCount + downvoteCount + (optional) voteOf.
 */
async function fetchChunk(entries, voter, wantMyVote) {
  const calls = [];
  for (const [, ref] of entries) {
    const id = refToBytes32(ref);
    calls.push({
      target: CONTRACT_ADDRESS,
      allowFailure: true,
      callData: iface.encodeFunctionData('upvoteCount', [id]),
    });
    calls.push({
      target: CONTRACT_ADDRESS,
      allowFailure: true,
      callData: iface.encodeFunctionData('downvoteCount', [id]),
    });
    if (wantMyVote) {
      calls.push({
        target: CONTRACT_ADDRESS,
        allowFailure: true,
        callData: iface.encodeFunctionData('voteOf', [id, voter]),
      });
    }
  }

  const results = await multicallAggregate(calls);
  const totals = new Map();
  const myVotes = new Map();
  const stride = wantMyVote ? 3 : 2;

  for (let i = 0; i < entries.length; i++) {
    const key = entries[i][0];
    const base = i * stride;
    const up = decodeResult(results[base], 'upvoteCount', iface);
    const down = decodeResult(results[base + 1], 'downvoteCount', iface);
    totals.set(key, {
      upvotes: up ? Number(up[0]) : 0,
      downvotes: down ? Number(down[0]) : 0,
    });
    if (wantMyVote) {
      const mv = decodeResult(results[base + 2], 'voteOf', iface);
      myVotes.set(key, mv ? Number(mv[0]) : 0);
    }
  }

  return { totals, myVotes };
}
