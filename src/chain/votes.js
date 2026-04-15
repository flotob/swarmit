/**
 * Batched vote reads via Multicall3 using the V3 packed voteStats call.
 * Each submission requires only 1 Multicall3 sub-call (was 3 in V2).
 */

import { ZeroAddress } from 'ethers';
import { iface } from 'swarmit-protocol/chain';
import { refToBytes32 } from '../protocol/references.js';
import { CONTRACT_ADDRESS, isContractConfigured } from './contract.js';
import { multicallAggregate, decodeResult, chunk, dedupeByLowercase, MAX_BATCH_SIZE } from './multicall.js';

/**
 * Batch-fetch vote totals and the caller's current vote for many
 * submissions via Multicall3 + voteStats (1 call per submission).
 *
 * @param {string[]} submissionRefs - bzz:// refs or hex strings
 * @param {string} [voter] - optional EVM address
 * @returns {Promise<{ totals: Map, myVotes: Map }>}
 */
export async function getVotesBatch(submissionRefs, voter) {
  const totals = new Map();
  const myVotes = new Map();
  if (!isContractConfigured() || !submissionRefs?.length) return { totals, myVotes };

  const unique = dedupeByLowercase(submissionRefs);
  if (!unique.size) return { totals, myVotes };

  const entries = [...unique.entries()];
  const voterAddr = voter || ZeroAddress;

  const chunkResults = await Promise.all(
    chunk(entries, MAX_BATCH_SIZE).map((c) => fetchChunk(c, voterAddr, !!voter)),
  );

  for (const { totals: t, myVotes: m } of chunkResults) {
    for (const [k, v] of t) totals.set(k, v);
    for (const [k, v] of m) myVotes.set(k, v);
  }

  return { totals, myVotes };
}

async function fetchChunk(entries, voterAddr, wantMyVote) {
  const calls = entries.map(([, ref]) => ({
    target: CONTRACT_ADDRESS,
    allowFailure: true,
    callData: iface.encodeFunctionData('voteStats', [refToBytes32(ref), voterAddr]),
  }));

  const results = await multicallAggregate(calls);
  const totals = new Map();
  const myVotes = new Map();

  for (let i = 0; i < entries.length; i++) {
    const key = entries[i][0];
    const decoded = decodeResult(results[i], 'voteStats', iface);
    if (decoded) {
      totals.set(key, { upvotes: Number(decoded[0]), downvotes: Number(decoded[1]) });
      if (wantMyVote) myVotes.set(key, Number(decoded[2]));
    } else {
      totals.set(key, { upvotes: 0, downvotes: 0 });
      if (wantMyVote) myVotes.set(key, 0);
    }
  }

  return { totals, myVotes };
}
