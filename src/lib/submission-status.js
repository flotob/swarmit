/**
 * Submission lifecycle status constants and metadata.
 */

export const STATUS = {
  ANNOUNCED: 'announced',
  WAITING: 'waiting',
  CURATED: 'curated',
  SETTLED: 'settled',
}

export const STATUS_ICONS = {
  [STATUS.ANNOUNCED]: '◉',
  [STATUS.WAITING]: '○',
  [STATUS.CURATED]: '●',
  [STATUS.SETTLED]: '●',
}

export const STATUS_LABELS = {
  [STATUS.ANNOUNCED]: 'Announced',
  [STATUS.WAITING]: 'Waiting for curators...',
  [STATUS.CURATED]: 'Curated',
  [STATUS.SETTLED]: 'Settled',
}
