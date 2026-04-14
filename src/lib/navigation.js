import { refToHex } from '../protocol/references.js'
import { validate } from '../protocol/objects.js'
import { fetchObject } from '../swarm/fetch.js'

/**
 * Resolve the root thread hex for a submission entry.
 * Posts use their own ref; replies resolve via rootSubmissionId
 * (from local store) or by fetching the submission from Swarm.
 */
export async function resolveThreadRootHex(entry) {
  if (entry.kind === 'post') {
    return refToHex(entry.submissionRef)
  }
  if (entry.rootSubmissionId) {
    return refToHex(entry.rootSubmissionId)
  }
  try {
    const sub = await fetchObject(entry.submissionRef)
    const { valid } = validate(sub)
    return valid ? refToHex(sub.rootSubmissionId || entry.submissionRef) : refToHex(entry.submissionRef)
  } catch {
    return refToHex(entry.submissionRef)
  }
}
