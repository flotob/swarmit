import { ref } from 'vue'
import { useWallet } from './useWallet.js'
import { useSwarm } from './useSwarm.js'
import { useAuthStore } from '../stores/auth'
import { useSubmissionsStore } from '../stores/submissions'
import { validate, buildPost, buildReply, buildSubmission, buildUserFeedEntry } from '../protocol/objects.js'
import { slugToBoardId } from '../protocol/references.js'
import { announceSubmission, declareUserFeed } from '../chain/transactions.js'
import { isContractConfigured } from '../chain/contract.js'
import { hasUserFeed } from '../chain/events.js'
import { feedIdFromCoordinates } from 'swarmit-protocol/feeds'
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
    await swarm.ensureUserFeed()
    return { userAddress: auth.userAddress }
  }

  async function publishValidated(obj, label) {
    const res = validate(obj)
    if (!res.valid) throw new Error(`${label} validation failed: ${res.errors.join(', ')}`)
    return swarm.publishJSON(obj, label)
  }

  async function runPipeline({ boardSlug, kind, contentLabel, contentBuilderFn, existingContentRef, submissionExtras, chainExtras, stepNames }) {
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
      setStep('Ensure identity', 'active')
      const { userAddress } = await ensureIdentity()
      const author = { address: userAddress }
      setStep('Ensure identity', 'done', userAddress)

      let contentRef
      let contentTitle = null
      let contentBodyPreview = null
      if (existingContentRef) {
        contentRef = existingContentRef
      } else {
        setStep(contentLabel, 'active')
        const content = contentBuilderFn(author)
        const contentResult = await publishValidated(content, kind)
        contentRef = contentResult.bzzUrl
        contentTitle = content.title || null
        contentBodyPreview = content.body?.text?.slice(0, 100) || null
        setStep(contentLabel, 'done', contentResult.bzzUrl)
      }

      setStep('Publish submission', 'active')
      const submission = buildSubmission({
        boardId: slugToBoardId(boardSlug),
        kind,
        contentRef,
        author,
        ...submissionExtras,
      })
      const subResult = await publishValidated(submission, 'submission')
      setStep('Publish submission', 'done', subResult.bzzUrl)

      setStep('Update user feed', 'active')
      const feedEntry = buildUserFeedEntry({
        submissionRef: subResult.bzzUrl,
        boardSlug,
        kind,
      })
      await swarm.writeFeedEntry(
        FREEDOM_ADAPTER.USER_FEED_NAME,
        JSON.stringify(feedEntry),
      )
      // Declare feed on-chain if not yet declared (one-time, best-effort)
      if (isContractConfigured() && auth.userFeedTopic && auth.userFeedOwner) {
        try {
          const feedId = feedIdFromCoordinates(auth.userFeedTopic, auth.userFeedOwner)
          const declared = await hasUserFeed(userAddress, feedId)
          if (!declared) {
            await declareUserFeed(auth.userFeedTopic, auth.userFeedOwner)
          }
        } catch {
          // Non-critical — feed discovery is a convenience, not required for publishing
        }
      }
      setStep('Update user feed', 'done')

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
        contentRef,
        submissionRef: subResult.bzzUrl,
        announced,
      }

      // Track in submissions store for lifecycle monitoring
      submissions.add({
        submissionRef: subResult.bzzUrl,
        contentRef,
        boardSlug,
        kind,
        title: contentTitle,
        bodyPreview: contentBodyPreview,
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
  const CROSSPOST_STEPS = ['Ensure identity', 'Publish submission', 'Update user feed', 'Announce on-chain']

  async function publishPost({ boardSlug, title, bodyText, link, attachments }) {
    return runPipeline({
      boardSlug,
      kind: 'post',
      contentLabel: 'Publish post',
      contentBuilderFn: (author) => buildPost({
        author,
        title,
        body: bodyText ? { kind: 'markdown', text: bodyText } : undefined,
        link,
        attachments,
      }),
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

  // Provenance points one hop back (linked list, not flattened origin) —
  // crosspost-of-crosspost preserves the chain.
  async function publishCrosspost({ targetBoardSlug, contentRef, sourceBoardSlug, sourceSubmissionRef }) {
    return runPipeline({
      boardSlug: targetBoardSlug,
      kind: 'post',
      existingContentRef: contentRef,
      submissionExtras: {
        metadata: {
          crosspost: {
            fromBoard: sourceBoardSlug,
            fromSubmissionRef: sourceSubmissionRef,
          },
        },
      },
      chainExtras: { parentSubmissionId: null, rootSubmissionId: null },
      stepNames: CROSSPOST_STEPS,
    })
  }

  return { publishPost, publishReply, publishCrosspost, steps, isPublishing, result, error }
}
