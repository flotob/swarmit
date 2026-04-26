/**
 * Read a user's activity feed entries from Swarm via on-chain feed discovery.
 * Merges entries from all declared feeds (a user may have multiple feeds
 * from different deployments/identities), deduped by submissionRef.
 */

import { getUserFeeds } from '../chain/events.js'
import { isContractConfigured } from '../chain/contract.js'
import { decodeFeedJSON, topicToSwarmFormat } from 'swarmit-protocol/feeds'
import { isFreedomDetected, httpReadLatestFeedEntry } from '../lib/bee-gateway.js'

/**
 * Read entries from a single feed via window.swarm (full history).
 */
async function readSingleFeedFreedom(swarm, topic, owner, maxEntries) {
  const readParams = {
    topic: topicToSwarmFormat(topic),
    owner,
  }

  let latest
  try {
    latest = await swarm.readFeedEntry(readParams)
  } catch {
    return []
  }

  const totalEntries = latest.nextIndex ?? (latest.index + 1)
  const startIndex = Math.max(0, totalEntries - maxEntries)

  const entries = await Promise.all(
    Array.from({ length: totalEntries - startIndex }, (_, i) =>
      swarm.readFeedEntry({ ...readParams, index: startIndex + i })
        .then(decodeFeedJSON)
        .catch(() => null)
    ),
  )

  return entries.filter(Boolean)
}

/**
 * Read the latest entry of a single feed via the public Bee gateway HTTP API.
 * The /feeds endpoint only returns the latest payload (?index= is ignored
 * by the public gateway), so gateway mode is "latest only".
 */
async function readSingleFeedHttp(topic, owner) {
  try {
    const entry = await httpReadLatestFeedEntry(topicToSwarmFormat(topic), owner)
    return entry ? [entry] : []
  } catch {
    return []
  }
}

/**
 * @param {string} userAddress - wallet address to look up
 * @param {object} swarm - useSwarm() composable instance (used in Freedom mode)
 * @param {{ maxEntries?: number }} [opts] - max entries per feed (Freedom mode only)
 * @returns {Promise<{ entries: Array, feedFound: boolean, historyTruncated: boolean }>}
 *   historyTruncated is true when running outside Freedom (gateway mode):
 *   only the latest entry of each feed is fetched.
 */
export async function readUserFeed(userAddress, swarm, { maxEntries = 50 } = {}) {
  if (!userAddress || !isContractConfigured()) {
    return { entries: [], feedFound: false, historyTruncated: false }
  }

  let feeds
  try {
    feeds = await getUserFeeds(userAddress)
  } catch {
    return { entries: [], feedFound: false, historyTruncated: false }
  }

  if (!feeds.length) return { entries: [], feedFound: false, historyTruncated: false }

  const inFreedom = isFreedomDetected()

  // Read all declared feeds in parallel
  const perFeedResults = await Promise.all(
    feeds.map((f) =>
      inFreedom
        ? readSingleFeedFreedom(swarm, f.feedTopic, f.feedOwner, maxEntries)
        : readSingleFeedHttp(f.feedTopic, f.feedOwner)
    )
  )

  // Merge + dedup by submissionRef + sort by createdAt descending
  const seen = new Set()
  const merged = perFeedResults
    .flat()
    .sort((a, b) => b.createdAt - a.createdAt)
    .filter((e) => {
      if (seen.has(e.submissionRef)) return false
      seen.add(e.submissionRef)
      return true
    })

  return { entries: merged, feedFound: true, historyTruncated: !inFreedom }
}
