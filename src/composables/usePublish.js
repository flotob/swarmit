import { ref } from 'vue'
import { useWallet } from './useWallet.js'
import { useSwarm } from './useSwarm.js'
import { useAuthStore } from '../stores/auth'
import { useSubmissionsStore } from '../stores/submissions'
import { validate, buildPost, buildReply, buildSubmission, buildUserFeedIndex } from '../protocol/objects.js'
import { resolveFeed } from '../swarm/feeds.js'
import { announceSubmission } from '../chain/transactions.js'
import { isContractConfigured } from '../chain/contract.js'
import { FREEDOM_ADAPTER } from '../config'

let pipelineLock = false

/**
 * Publish composable — provides publishPost and publishReply with reactive progress.
 */
export function usePublish() {
  const wallet = useWallet()
  const swarm = useSwarm()
  const auth = useAuthStore()
  const submissions = useSubmissionsStore()

  const steps = ref([])
  const isPublishing = ref(false)
  const result = ref(null)
  const error = ref(null)

  function setStep(name, status, detail) {
    const existing = steps.value.find((s) => s.name === name)
    if (existing) {
      existing.status = status
      existing.detail = detail || ''
    }
  }

  async function ensureIdentity() {
    if (!auth.walletConnected) {
      setStep('Ensure identity', 'active', 'Connecting wallet...')
      await wallet.connect()
    }
    if (!auth.swarmConnected) {
      setStep('Ensure identity', 'active', 'Connecting to Swarm...')
      await swarm.connect()
    }
    const userFeed = await swarm.ensureUserFeed()
    return { userAddress: auth.userAddress, userFeed }
  }

  async function publishValidated(obj, label) {
    const res = validate(obj)
    if (!res.valid) throw new Error(`${label} validation failed: ${res.errors.join(', ')}`)
    return swarm.publishJSON(obj, label)
  }

  async function readCurrentUserFeedIndex(userFeed) {
    try {
      const index = await resolveFeed(userFeed)
      if (!index) return null
      const { valid, errors } = validate(index)
      if (!valid) throw new Error(`Invalid userFeedIndex: ${errors.join(', ')}`)
      return index
    } catch (err) {
      if (err.message.includes('404')) return null
      throw new Error(`Cannot read user feed: ${err.message}`)
    }
  }

  async function runPipeline({ boardSlug, kind, contentLabel, contentBuilderFn, submissionExtras, chainExtras, stepNames }) {
    if (pipelineLock) {
      error.value = 'A publish is already in progress'
      throw new Error('A publish is already in progress')
    }
    pipelineLock = true

    steps.value = stepNames.map((name) => ({ name, status: 'pending', detail: '' }))
    isPublishing.value = true
    result.value = null
    error.value = null

    try {
      // Step 1: Identity
      setStep('Ensure identity', 'active')
      const { userAddress, userFeed } = await ensureIdentity()
      const author = { address: userAddress, userFeed }
      setStep('Ensure identity', 'done', userAddress)

      // Step 2: Build + publish content
      setStep(contentLabel, 'active')
      const content = contentBuilderFn(author)
      const contentResult = await publishValidated(content, kind)
      setStep(contentLabel, 'done', contentResult.bzzUrl)

      // Step 3: Build + publish submission
      setStep('Publish submission', 'active')
      const submission = buildSubmission({
        boardId: boardSlug,
        kind,
        contentRef: contentResult.bzzUrl,
        author,
        ...submissionExtras,
      })
      const subResult = await publishValidated(submission, 'submission')
      setStep('Publish submission', 'done', subResult.bzzUrl)

      // Step 4: Update user feed
      setStep('Update user feed', 'active')
      const currentIndex = await readCurrentUserFeedIndex(userFeed)
      const entries = currentIndex ? [...currentIndex.entries] : []
      entries.push({
        submissionId: subResult.bzzUrl,
        submissionRef: subResult.bzzUrl,
        boardId: boardSlug,
        kind,
        createdAt: submission.createdAt,
      })
      const newIndex = buildUserFeedIndex({ author: userAddress, entries })
      const indexResult = await publishValidated(newIndex, 'userFeedIndex')
      await swarm.updateFeed(FREEDOM_ADAPTER.USER_FEED_NAME, indexResult.reference)
      setStep('Update user feed', 'done', `${entries.length} entries`)

      // Step 5: Announce on-chain
      let announced = false
      if (isContractConfigured()) {
        setStep('Announce on-chain', 'active')
        try {
          const tx = await announceSubmission({
            boardSlug,
            submissionRef: subResult.bzzUrl,
            ...chainExtras,
          })
          setStep('Announce on-chain', 'done', `tx: ${tx}`)
          announced = true
        } catch (err) {
          setStep('Announce on-chain', 'error', err.message)
        }
      } else {
        setStep('Announce on-chain', 'skipped', 'Contract not configured')
      }

      result.value = {
        contentRef: contentResult.bzzUrl,
        submissionRef: subResult.bzzUrl,
        userFeedIndexRef: indexResult.bzzUrl,
        announced,
      }

      // Track in submissions store for lifecycle monitoring
      submissions.add({
        submissionRef: subResult.bzzUrl,
        contentRef: contentResult.bzzUrl,
        boardSlug,
        kind,
        title: content.title || null,
        bodyPreview: content.body?.text?.slice(0, 100) || null,
        rootSubmissionId: submissionExtras.rootSubmissionId || subResult.bzzUrl,
        parentSubmissionId: submissionExtras.parentSubmissionId || null,
        txHash: null, // We don't have the tx hash from announceSubmission currently
        announced,
      })
    } catch (err) {
      // Mark the active step as error
      const active = steps.value.find((s) => s.status === 'active')
      if (active) {
        active.status = 'error'
        active.detail = err.message
      }
      error.value = err.message
      throw err
    } finally {
      pipelineLock = false
      isPublishing.value = false
    }
  }

  const POST_STEPS = ['Ensure identity', 'Publish post', 'Publish submission', 'Update user feed', 'Announce on-chain']
  const REPLY_STEPS = ['Ensure identity', 'Publish reply', 'Publish submission', 'Update user feed', 'Announce on-chain']

  async function publishPost({ boardSlug, title, bodyText, attachments }) {
    return runPipeline({
      boardSlug,
      kind: 'post',
      contentLabel: 'Publish post',
      contentBuilderFn: (author) => buildPost({ author, title, body: { kind: 'markdown', text: bodyText }, attachments }),
      submissionExtras: {},
      chainExtras: { parentSubmissionId: null, rootSubmissionId: null },
      stepNames: POST_STEPS,
    })
  }

  async function publishReply({ boardSlug, bodyText, parentSubmissionId, rootSubmissionId }) {
    return runPipeline({
      boardSlug,
      kind: 'reply',
      contentLabel: 'Publish reply',
      contentBuilderFn: (author) => buildReply({ author, body: { kind: 'markdown', text: bodyText } }),
      submissionExtras: { parentSubmissionId, rootSubmissionId },
      chainExtras: { parentSubmissionId, rootSubmissionId },
      stepNames: REPLY_STEPS,
    })
  }

  return { publishPost, publishReply, steps, isPublishing, result, error }
}
