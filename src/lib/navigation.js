import { refToHex } from '../protocol/references.js'
import { validate } from '../protocol/objects.js'
import { fetchObject } from '../swarm/fetch.js'

/**
 * Resolve thread navigation target for a submission entry.
 * Returns { rootHex, commentHex } — commentHex is set only for replies.
 */
export async function resolveThreadTarget(entry) {
  const entryHex = refToHex(entry.submissionRef)
  if (entry.kind === 'post') {
    return { rootHex: entryHex, commentHex: null }
  }
  let rootHex
  if (entry.rootSubmissionId) {
    rootHex = refToHex(entry.rootSubmissionId)
  } else {
    try {
      const sub = await fetchObject(entry.submissionRef)
      const { valid } = validate(sub)
      rootHex = valid ? refToHex(sub.rootSubmissionId || entry.submissionRef) : entryHex
    } catch {
      rootHex = entryHex
    }
  }
  return { rootHex, commentHex: rootHex !== entryHex ? entryHex : null }
}
