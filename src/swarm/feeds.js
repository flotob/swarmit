/**
 * Resolve Swarm feed-backed objects.
 * A feed manifest is a stable bzz:// URL that always resolves to the
 * latest content the feed owner has pointed it at.
 *
 * Resolution: fetch('/bzz/<feedManifestHex>/') returns the latest
 * immutable content behind the feed — typically a JSON index object.
 */

import { fetchObject } from './fetch.js';
import { refToHex } from '../protocol/references.js';
import { validate, TYPES } from '../protocol/objects.js';

// TTL cache for curator profiles. Keyed by ref hex → { profile, fetchedAt }.
// Short TTL (30s) so feed-backed profiles refresh reasonably quickly.
const profileCache = new Map();
const PROFILE_TTL_MS = 30_000;

/**
 * Resolve a feed manifest to its latest content.
 * Feed manifests are NOT cached — they're mutable pointers.
 * The underlying content (once resolved) IS cached by fetchObject.
 * @param {string} feedManifestRef - bzz:// URL or bare hex of the feed manifest
 * @returns {Promise<Object>} The latest JSON object the feed points to
 */
export async function resolveFeed(feedManifestRef) {
  const hex = refToHex(feedManifestRef);
  if (!hex) throw new Error('Invalid feed manifest reference');

  // Fetch the feed manifest — this resolves to the latest content.
  // We bypass the cache because the feed is mutable.
  const response = await fetch(`/bzz/${hex}/`);

  if (!response.ok) {
    throw new Error(`Feed resolution failed: ${response.status} for ${hex}`);
  }

  return response.json();
}

/**
 * Resolve a curator profile from a stable Swarm locator.
 *
 * Works for both old-style immutable content refs and new-style feed
 * manifest refs — both resolve via /bzz/<ref>/. Uses a 30s TTL cache
 * so feed-backed profiles refresh without hammering the gateway.
 *
 * Does NOT use fetchObject() (which caches immutably forever).
 *
 * @param {string} curatorProfileRef - bzz:// URL or bare hex
 * @returns {Promise<Object>} Validated curatorProfile object
 */
export async function resolveCuratorProfile(curatorProfileRef) {
  const hex = refToHex(curatorProfileRef);
  if (!hex) throw new Error('Invalid curator profile reference');

  const now = Date.now();
  const cached = profileCache.get(hex);
  if (cached && (now - cached.fetchedAt) < PROFILE_TTL_MS) {
    return cached.profile;
  }

  const response = await fetch(`/bzz/${hex}/`);
  if (!response.ok) {
    throw new Error(`Curator profile fetch failed: ${response.status} for ${hex}`);
  }

  const profile = await response.json();

  const { valid, errors } = validate(profile);
  if (!valid || profile.protocol !== TYPES.CURATOR) {
    throw new Error(`Invalid curator profile at ${hex}: ${(errors || []).join(', ')}`);
  }

  profileCache.set(hex, { profile, fetchedAt: now });
  return profile;
}

/**
 * Fetch a curator's boardIndex for a specific board.
 * Looks up the board feed from the curator profile and resolves it.
 * @param {Object} curatorProfile - The curatorProfile object
 * @param {string} boardId - The board slug/ID
 * @returns {Promise<Object|null>} The boardIndex object, or null if not available
 */
export async function fetchBoardIndex(curatorProfile, boardId, viewId) {
  // Try named view feed first
  const viewFeed = viewId && curatorProfile?.boardViewFeeds?.[boardId]?.[viewId];
  const defaultFeed = curatorProfile?.boardFeeds?.[boardId];
  const feedRef = viewFeed || defaultFeed;
  if (!feedRef) return null;

  try {
    return await resolveFeed(feedRef);
  } catch (err) {
    console.warn(`[Feeds] Failed to resolve boardIndex for ${boardId}:`, err.message);
    return null;
  }
}

// Thread index resolution is deferred to WP8 (thread view).
// The spec says the client resolves the curator's threadIndex feed
// for a root submission, but the exact discovery mechanism (how the
// client finds the feed manifest for a specific thread) is not yet
// defined in the curator profile schema.

/**
 * Fetch a curator's globalIndex.
 * @param {Object} curatorProfile - The curatorProfile object
 * @returns {Promise<Object|null>} The globalIndex object, or null
 */
export async function fetchGlobalIndex(curatorProfile, viewId) {
  // Try named view feed first
  const viewFeed = viewId && curatorProfile?.globalViewFeeds?.[viewId];
  const defaultFeed = curatorProfile?.globalIndexFeed;
  const feedRef = viewFeed || defaultFeed;
  if (!feedRef) return null;

  try {
    return await resolveFeed(feedRef);
  } catch (err) {
    console.warn(`[Feeds] Failed to resolve globalIndex:`, err.message);
    return null;
  }
}
