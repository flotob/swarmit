/**
 * Submission lifecycle status constants and metadata.
 */

export const STATUS = {
  PUBLISHED: 'published',   // on Swarm but NOT announced on-chain
  ANNOUNCED: 'announced',   // chain tx sent (not necessarily confirmed)
  WAITING: 'waiting',       // announced, no curator pickup yet
  CURATED: 'curated',       // at least one curator picked it up (still polling for more)
  SETTLED: 'settled',       // curated and past TTL (no more polling)
}

export const STATUS_ICONS = {
  [STATUS.PUBLISHED]: '◇',
  [STATUS.ANNOUNCED]: '◉',
  [STATUS.WAITING]: '○',
  [STATUS.CURATED]: '●',
  [STATUS.SETTLED]: '●',
}

export const STATUS_LABELS = {
  [STATUS.PUBLISHED]: 'Published to Swarm (not on-chain)',
  [STATUS.ANNOUNCED]: 'Announced on-chain',
  [STATUS.WAITING]: 'Waiting for curators...',
  [STATUS.CURATED]: 'Curated',
  [STATUS.SETTLED]: 'Settled',
}
