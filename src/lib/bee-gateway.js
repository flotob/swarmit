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
