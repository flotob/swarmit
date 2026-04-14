/**
 * Read a user's activity feed entries from Swarm via on-chain feed discovery.
 * Merges entries from all declared feeds (a user may have multiple feeds
 * from different deployments/identities), deduped by submissionRef.
 */

import { getUserFeeds } from '../chain/events.js'
import { isContractConfigured } from '../chain/contract.js'
import { decodeFeedJSON, topicToSwarmFormat } from 'swarmit-protocol/feeds'

/**
 * Read entries from a single feed.
 * @returns {Promise<Array>} entries (may be empty)
 */
async function readSingleFeed(swarm, topic, owner, maxEntries) {
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
 * @param {string} userAddress - wallet address to look up
 * @param {object} swarm - useSwarm() composable instance (needs readFeedEntry)
 * @param {{ maxEntries?: number }} [opts] - max entries per feed
 * @returns {Promise<{ entries: Array, feedFound: boolean }>}
 */
export async function readUserFeed(userAddress, swarm, { maxEntries = 50 } = {}) {
  if (!userAddress || !isContractConfigured()) {
    return { entries: [], feedFound: false }
  }

  let feeds
  try {
    feeds = await getUserFeeds(userAddress)
  } catch {
    return { entries: [], feedFound: false }
  }

  if (!feeds.length) return { entries: [], feedFound: false }

  // Read all declared feeds in parallel
  const perFeedResults = await Promise.all(
    feeds.map((f) => readSingleFeed(swarm, f.feedTopic, f.feedOwner, maxEntries))
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

  return { entries: merged, feedFound: true }
}
