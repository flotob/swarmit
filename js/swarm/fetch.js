/**
 * Fetch immutable Swarm objects by reference.
 * All reads go through the Bee gateway that Freedom proxies automatically.
 * Immutable content is cached indefinitely within a session.
 */

// In-memory cache: reference → parsed object. Immutable content never changes.
const cache = new Map();

/**
 * Extract the 64-char hex reference from a bzz:// URL or bare hex string.
 * @param {string} ref - 'bzz://abc123...' or 'abc123...'
 * @returns {string} 64-char hex
 */
export function refToHex(ref) {
  if (!ref || typeof ref !== 'string') return '';
  return ref.replace(/^bzz:\/\//, '').trim();
}

/**
 * Fetch a JSON object from Swarm by reference.
 * @param {string} ref - bzz:// URL or bare hex reference
 * @returns {Promise<Object>} Parsed JSON object
 */
export async function fetchObject(ref) {
  const hex = refToHex(ref);
  if (!hex) throw new Error('Invalid Swarm reference');

  if (cache.has(hex)) {
    return cache.get(hex);
  }

  const response = await fetch(`/bzz/${hex}/`);

  if (!response.ok) {
    throw new Error(`Swarm fetch failed: ${response.status} for ${hex}`);
  }

  const obj = await response.json();
  cache.set(hex, obj);
  return obj;
}

/**
 * Fetch raw content from Swarm (non-JSON).
 * Not cached — used for attachments or non-protocol content.
 * @param {string} ref - bzz:// URL or bare hex reference
 * @returns {Promise<Response>}
 */
export async function fetchRaw(ref) {
  const hex = refToHex(ref);
  if (!hex) throw new Error('Invalid Swarm reference');

  const response = await fetch(`/bzz/${hex}/`);

  if (!response.ok) {
    throw new Error(`Swarm fetch failed: ${response.status} for ${hex}`);
  }

  return response;
}

/**
 * Fetch and validate a protocol object from Swarm.
 * Checks that the object has a `protocol` field.
 * @param {string} ref
 * @returns {Promise<Object>}
 */
export async function fetchProtocolObject(ref) {
  const obj = await fetchObject(ref);

  if (!obj.protocol || typeof obj.protocol !== 'string') {
    throw new Error(`Object at ${ref} is missing a valid 'protocol' field`);
  }

  return obj;
}

/**
 * Clear the cache. Useful for testing.
 */
export function clearCache() {
  cache.clear();
}

/**
 * Get cache size (for diagnostics).
 */
export function cacheSize() {
  return cache.size;
}
