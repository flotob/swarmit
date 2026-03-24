/**
 * Curator selection, fallthrough, and profile loading.
 * Shared by board and thread views.
 */

import { fetchObject } from '../swarm/fetch.js';
import { fetchBoardIndex } from '../swarm/feeds.js';
import { getCuratorDeclarations } from '../chain/events.js';
import { getCuratorPref } from '../state.js';

/**
 * Load all curator declarations from chain. Returns empty array on failure.
 */
export async function loadCurators() {
  try {
    const all = await getCuratorDeclarations();
    // Deduplicate: keep latest declaration per curator address
    const byAddr = new Map();
    for (const c of all) byAddr.set(c.curator.toLowerCase(), c);
    return [...byAddr.values()];
  } catch {
    return [];
  }
}

/**
 * Build an ordered list of curator addresses to try.
 * Order: user pref > board.defaultCurator > single endorsed > all declared.
 * Does NOT silently auto-pick when multiple curators exist and no preference is set.
 * @returns {{ candidates: string[], needsPrompt: boolean }}
 *   needsPrompt is true when there are multiple curators but no preference/default/single-endorsed
 */
export function getCuratorCandidates(slug, board, curators) {
  const seen = new Set();
  const candidates = [];

  function add(addr) {
    if (!addr) return;
    const lower = addr.toLowerCase();
    if (seen.has(lower)) return;
    seen.add(lower);
    candidates.push(addr);
  }

  // 1. User preference (highest priority)
  add(getCuratorPref(slug));

  // 2. Board default curator
  add(board?.defaultCurator);

  // 3. Single endorsed curator
  if (board?.endorsedCurators?.length === 1) {
    add(board.endorsedCurators[0]);
  }

  // Determine if we need a user prompt before adding all declared curators
  const needsPrompt = candidates.length === 0 && curators.length > 1;

  // 4. All declared curators (fallthrough order)
  for (const c of curators) {
    add(c.curator);
  }

  // preferredCandidate is the first candidate from pref/default/endorsed — before declared fallbacks
  const preferredCandidate = candidates.length > 0 && !needsPrompt ? candidates[0] : null;

  return { candidates, needsPrompt, preferredCandidate };
}

/**
 * Fetch a curator's profile by address.
 * @param {string} curatorAddress
 * @param {Array} curators - Result from loadCurators()
 * @returns {Promise<Object|null>}
 */
export async function fetchCuratorProfile(curatorAddress, curators) {
  const match = curators.find((c) => c.curator.toLowerCase() === curatorAddress.toLowerCase());
  if (!match) return null;
  try {
    return await fetchObject(match.curatorProfileRef);
  } catch {
    return null;
  }
}

/**
 * Try curators in order until one has a usable boardIndex for the given board.
 * Returns the first curator that resolves to a non-empty boardIndex.
 * @param {string} slug
 * @param {string[]} candidates - Ordered curator addresses
 * @param {Array} curators - Result from loadCurators()
 * @returns {Promise<{ curatorAddress: string, curatorProfile: Object, boardIndex: Object } | null>}
 */
export async function resolveBoard(slug, candidates, curators) {
  for (const addr of candidates) {
    const profile = await fetchCuratorProfile(addr, curators);
    if (!profile) continue;

    const boardIndex = await fetchBoardIndex(profile, slug);
    if (boardIndex?.entries?.length) {
      return { curatorAddress: addr, curatorProfile: profile, boardIndex };
    }
  }
  return null;
}

/**
 * Try curators in order until one has a usable threadIndex for a given root submission.
 * @param {string} slug
 * @param {string} rootSubRef - Normalized bzz:// ref of the root submission
 * @param {string[]} candidates
 * @param {Array} curators
 * @returns {Promise<{ curatorAddress: string, curatorProfile: Object, boardIndex: Object, threadIndex: Object } | null>}
 */
export async function resolveThread(slug, rootSubRef, candidates, curators) {
  for (const addr of candidates) {
    const profile = await fetchCuratorProfile(addr, curators);
    if (!profile) continue;

    const boardIndex = await fetchBoardIndex(profile, slug);
    if (!boardIndex?.entries) continue;

    const rootEntry = boardIndex.entries.find(
      (e) => e.submissionId === rootSubRef || e.submissionRef === rootSubRef
    );
    if (!rootEntry?.threadIndexFeed) continue;

    try {
      const { resolveFeed } = await import('../swarm/feeds.js');
      const threadIndex = await resolveFeed(rootEntry.threadIndexFeed);
      if (threadIndex?.nodes?.length) {
        return { curatorAddress: addr, curatorProfile: profile, boardIndex, threadIndex };
      }
    } catch {
      continue;
    }
  }
  return null;
}
