/**
 * Swarm provider wrapper.
 * Only module that touches window.swarm directly.
 */

import * as state from '../state.js';

/**
 * Check if the Swarm provider is available.
 */
export function isAvailable() {
  return !!(window.swarm && typeof window.swarm.request === 'function');
}

/**
 * Request Swarm publishing access. Shows the connection prompt.
 * @returns {Promise<Object>} { connected, origin, capabilities }
 */
export async function connect() {
  if (!isAvailable()) throw new Error('Swarm provider not available');

  const result = await window.swarm.requestAccess();
  state.update({ swarmConnected: true });

  // Listen for disconnect
  window.swarm.on('disconnect', () => {
    state.update({ swarmConnected: false });
  });

  return result;
}

/**
 * Get Swarm node capabilities.
 * @returns {Promise<Object>} { canPublish, reason?, limits }
 */
export async function getCapabilities() {
  if (!isAvailable()) throw new Error('Swarm provider not available');
  return window.swarm.getCapabilities();
}

/**
 * Publish a JSON object to Swarm as application/json.
 * Returns the normalized bzz:// reference.
 * @param {Object} obj - The object to serialize and publish
 * @param {string} [name] - Optional name for publish history
 * @returns {Promise<{ reference: string, bzzUrl: string }>}
 */
export async function publishJSON(obj, name) {
  if (!isAvailable()) throw new Error('Swarm provider not available');

  return window.swarm.publishData({
    data: JSON.stringify(obj),
    contentType: 'application/json',
    name: name || undefined,
  });
}

/**
 * Publish raw data to Swarm.
 * @param {string|Uint8Array} data
 * @param {string} contentType
 * @param {string} [name]
 * @returns {Promise<{ reference: string, bzzUrl: string }>}
 */
export async function publishData(data, contentType, name) {
  if (!isAvailable()) throw new Error('Swarm provider not available');

  return window.swarm.publishData({
    data,
    contentType,
    name: name || undefined,
  });
}

/**
 * Publish multiple files to Swarm.
 * @param {Array<{ path: string, bytes: Uint8Array, contentType?: string }>} files
 * @param {string} [indexDocument]
 * @returns {Promise<{ reference: string, bzzUrl: string, tagUid?: number }>}
 */
export async function publishFiles(files, indexDocument) {
  if (!isAvailable()) throw new Error('Swarm provider not available');

  return window.swarm.publishFiles({
    files,
    indexDocument: indexDocument || undefined,
  });
}

/**
 * Create a Swarm feed.
 * @param {string} name - Feed name
 * @returns {Promise<{ feedId: string, owner: string, topic: string, manifestReference: string, bzzUrl: string, identityMode: string }>}
 */
export async function createFeed(name) {
  if (!isAvailable()) throw new Error('Swarm provider not available');
  return window.swarm.createFeed({ name });
}

/**
 * Update a Swarm feed to point at a new reference.
 * @param {string} feedId - Feed name
 * @param {string} reference - 64-char hex Swarm reference
 * @returns {Promise<{ feedId: string, reference: string, bzzUrl: string }>}
 */
export async function updateFeed(feedId, reference) {
  if (!isAvailable()) throw new Error('Swarm provider not available');
  return window.swarm.updateFeed({ feedId, reference });
}

/**
 * Get upload status for a tagged upload.
 * @param {number} tagUid
 * @returns {Promise<{ tagUid: number, split: number, sent: number, progress: number, done: boolean }>}
 */
export async function getUploadStatus(tagUid) {
  if (!isAvailable()) throw new Error('Swarm provider not available');
  return window.swarm.getUploadStatus({ tagUid });
}
