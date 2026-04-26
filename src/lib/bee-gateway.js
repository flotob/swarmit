/**
 * Bee gateway origin resolution.
 *
 * In Freedom Browser, window.swarm is injected and the local Bee node
 * is reachable at the SPA's own origin via /bzz/. Outside Freedom (e.g.
 * via app.swarmit.eth.limo or any normal browser visiting a public ENS
 * gateway), the SPA's origin won't proxy /bzz/ paths, so we route reads
 * through a public Swarm gateway instead.
 *
 * This module is the single source of truth for that decision. All
 * /bzz/ fetches and asset URL constructions go through bzzFetchUrl().
 */

const FALLBACK_GATEWAY = (
  import.meta.env.VITE_FALLBACK_GATEWAY || 'https://api.gateway.ethswarm.org'
).replace(/\/+$/, '');

export function isFreedomDetected() {
  return typeof window !== 'undefined' && !!window.swarm;
}

export function getBeeOrigin() {
  return isFreedomDetected() ? '' : FALLBACK_GATEWAY;
}

export function bzzFetchUrl(hex) {
  return `${getBeeOrigin()}/bzz/${hex}/`;
}

/**
 * Read the latest entry of a Swarm feed via the Bee HTTP /feeds endpoint.
 * Use this only as a fallback for gateway mode — Freedom's window.swarm
 * provides full indexed access; HTTP only returns the latest payload
 * (the gateway's /feeds endpoint ignores ?index= in our tests).
 *
 * @param {string} topicHex - 64-char hex topic without 0x prefix
 * @param {string} owner - 0x-prefixed Ethereum address
 * @returns {Promise<any>} parsed JSON payload of the latest entry
 */
export async function httpReadLatestFeedEntry(topicHex, owner) {
  const url = `${getBeeOrigin()}/feeds/${owner.toLowerCase()}/${topicHex}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Feed read failed: ${response.status}`);
  }
  return response.json();
}
