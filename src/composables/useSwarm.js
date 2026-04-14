import { useAuthStore } from '../stores/auth'
import { FREEDOM_ADAPTER } from '../config'
import { hexToBzz } from '../protocol/references.js'

/**
 * Swarm composable — single source of truth for Swarm connection and publishing.
 * Wraps window.swarm and writes to Pinia.
 */
export function useSwarm() {
  const auth = useAuthStore()

  function isAvailable() {
    return !!(window.swarm && typeof window.swarm.request === 'function')
  }

  async function connect() {
    if (!isAvailable()) throw new Error('Swarm provider not available')
    const result = await window.swarm.requestAccess()
    auth.setSwarmConnected(true)
    return result
  }

  async function publishJSON(obj, name) {
    if (!isAvailable()) throw new Error('Swarm provider not available')
    const result = await window.swarm.publishData({
      data: JSON.stringify(obj),
      contentType: 'application/json',
      name: name || undefined,
    })
    const ref = result.reference || ''
    const bzzUrl = result.bzzUrl || hexToBzz(ref)
    return { reference: ref, bzzUrl }
  }

  async function publishData(data, contentType, name) {
    if (!isAvailable()) throw new Error('Swarm provider not available')
    const result = await window.swarm.publishData({ data, contentType, name: name || undefined })
    const ref = result.reference || ''
    const bzzUrl = result.bzzUrl || hexToBzz(ref)
    return { reference: ref, bzzUrl }
  }

  async function createFeed(name) {
    if (!isAvailable()) throw new Error('Swarm provider not available')
    return window.swarm.createFeed({ name })
  }

  async function updateFeed(feedId, reference) {
    if (!isAvailable()) throw new Error('Swarm provider not available')
    return window.swarm.updateFeed({ feedId, reference })
  }

  /**
   * Ensure user feed exists and store its coordinates.
   * Idempotent: createFeed with the same name returns the same feed.
   */
  async function ensureUserFeed() {
    if (auth.userFeedTopic) return

    const result = await createFeed(FREEDOM_ADAPTER.USER_FEED_NAME)
    if (result.topic) auth.setUserFeedTopic(result.topic)
    if (result.owner) auth.setUserFeedOwner(result.owner)
  }

  async function writeFeedEntry(name, data) {
    if (!isAvailable()) throw new Error('Swarm provider not available')
    return window.swarm.writeFeedEntry({ name, data })
  }

  async function readFeedEntry(params) {
    if (!isAvailable()) throw new Error('Swarm provider not available')
    return window.swarm.readFeedEntry(params)
  }

  return { isAvailable, connect, publishJSON, publishData, createFeed, updateFeed, ensureUserFeed, writeFeedEntry, readFeedEntry }
}
