/**
 * Submission lifecycle status constants and metadata.
 */

export const STATUS = {
  PUBLISHED: 'published',   // on Swarm but NOT announced on-chain
  ANNOUNCED: 'announced',   // chain tx sent (not necessarily confirmed)
                             // TODO: Currently unused — nothing sets this status yet.
                             // Currently submissions go straight from PUBLISHED to WAITING.
                             // To use ANNOUNCED, add tx receipt polling in usePublish to
                             // distinguish "tx sent" from "tx confirmed". This would enable
                             // a visible "Announced on-chain (confirming...)" → "Waiting for curators" transition.
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
