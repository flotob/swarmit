// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// ---------- Mocks ----------

const mockWalletConnect = vi.fn()
vi.mock('../../src/composables/useWallet.js', () => ({
  useWallet: () => ({ connect: mockWalletConnect }),
}))

const mockPublishJSON = vi.fn()
const mockSwarmConnect = vi.fn()
const mockEnsureUserFeed = vi.fn()
const mockUpdateFeed = vi.fn()
const mockWriteFeedEntry = vi.fn()
vi.mock('../../src/composables/useSwarm.js', () => ({
  useSwarm: () => ({
    connect: mockSwarmConnect,
    publishJSON: mockPublishJSON,
    ensureUserFeed: mockEnsureUserFeed,
    updateFeed: mockUpdateFeed,
    writeFeedEntry: mockWriteFeedEntry,
  }),
}))

const mockAnnounceSubmission = vi.fn()
vi.mock('../../src/chain/transactions.js', () => ({
  announceSubmission: mockAnnounceSubmission,
}))

vi.mock('../../src/chain/contract.js', () => ({
  isContractConfigured: () => true,
}))

vi.mock('../../src/config', () => ({
  FREEDOM_ADAPTER: { USER_FEED_NAME: 'swarmit-user' },
}))

// ---------- Imports after mocks ----------

const { usePublish } = await import('../../src/composables/usePublish.js')
const { useAuthStore } = await import('../../src/stores/auth.js')

const USER = '0x1111111111111111111111111111111111111111'
const POST_REF = 'bzz://' + 'a'.repeat(64)                 // the original post content
const ORIGINAL_SUB_REF = 'bzz://' + 'b'.repeat(64)          // submission in r/tech
const CROSSPOST1_SUB_REF = 'bzz://' + 'c'.repeat(64)        // crosspost → r/science
const CROSSPOST2_SUB_REF = 'bzz://' + 'd'.repeat(64)        // crosspost of crosspost → r/programming

function nextRef(bzzRef) {
  return { reference: bzzRef.slice(6), bzzUrl: bzzRef }
}

describe('usePublish.publishCrosspost', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const auth = useAuthStore()
    auth.setWallet(USER)
    auth.setSwarmConnected(true)
    auth.setUserFeedTopic('ff'.repeat(32))

    mockWalletConnect.mockReset()
    mockSwarmConnect.mockReset()
    mockPublishJSON.mockReset()
    mockEnsureUserFeed.mockReset().mockResolvedValue(undefined)
    mockUpdateFeed.mockReset().mockResolvedValue(undefined)
    mockWriteFeedEntry.mockReset().mockResolvedValue({ index: 0 })
    mockAnnounceSubmission.mockReset().mockResolvedValue('0xdeadbeef')
  })

  it('publishes a new submission reusing the existing contentRef (no content publish)', async () => {
    // publishJSON called once for the submission only (feed entry is written via writeFeedEntry)
    mockPublishJSON.mockResolvedValueOnce(nextRef(CROSSPOST1_SUB_REF))

    const { publishCrosspost, result, error } = usePublish()

    await publishCrosspost({
      targetBoardSlug: 'science',
      contentRef: POST_REF,
      sourceBoardSlug: 'tech',
      sourceSubmissionRef: ORIGINAL_SUB_REF,
    })

    expect(error.value).toBeNull()
    expect(result.value).toBeTruthy()
    expect(result.value.contentRef).toBe(POST_REF)
    expect(result.value.submissionRef).toBe(CROSSPOST1_SUB_REF)

    // Only the submission object is published via publishJSON (no content, no feed index)
    expect(mockPublishJSON).toHaveBeenCalledTimes(1)

    const submissionArg = mockPublishJSON.mock.calls[0][0]
    expect(submissionArg.protocol).toBe('freedom-board/submission/v1')
    // boardId is now bytes32 (keccak256 of slug), not the raw slug
    expect(submissionArg.boardId).toMatch(/^0x[0-9a-f]{64}$/)
    expect(submissionArg.kind).toBe('post')
    expect(submissionArg.contentRef).toBe(POST_REF)
    expect(submissionArg.author.address).toBe(USER)
    expect(submissionArg.author.userFeed).toBeUndefined()
    expect(submissionArg.metadata).toEqual({
      crosspost: {
        fromBoard: 'tech',
        fromSubmissionRef: ORIGINAL_SUB_REF,
      },
    })

    // Feed entry written via journal pattern
    expect(mockWriteFeedEntry).toHaveBeenCalledTimes(1)
  })

  it('announces the new submission on-chain with the target boardSlug', async () => {
    mockPublishJSON.mockResolvedValueOnce(nextRef(CROSSPOST1_SUB_REF))

    const { publishCrosspost } = usePublish()

    await publishCrosspost({
      targetBoardSlug: 'science',
      contentRef: POST_REF,
      sourceBoardSlug: 'tech',
      sourceSubmissionRef: ORIGINAL_SUB_REF,
    })

    expect(mockAnnounceSubmission).toHaveBeenCalledTimes(1)
    const call = mockAnnounceSubmission.mock.calls[0][0]
    expect(call.boardSlug).toBe('science')
    expect(call.submissionRef).toBe(CROSSPOST1_SUB_REF)
    expect(call.parentSubmissionId).toBeNull()
    expect(call.rootSubmissionId).toBeNull()
  })

  it('preserves provenance one-hop-back when crossposting a crosspost (linked list, not flattened origin)', async () => {
    // Scenario: user already viewed the crosspost in r/science (CROSSPOST1_SUB_REF)
    // and wants to crosspost that to r/programming. The source must be r/science +
    // CROSSPOST1_SUB_REF — NOT r/tech + ORIGINAL_SUB_REF.
    mockPublishJSON.mockResolvedValueOnce(nextRef(CROSSPOST2_SUB_REF))

    const { publishCrosspost } = usePublish()

    await publishCrosspost({
      targetBoardSlug: 'programming',
      contentRef: POST_REF,                         // same original post object
      sourceBoardSlug: 'science',                   // the board the user is crossposting FROM
      sourceSubmissionRef: CROSSPOST1_SUB_REF,      // the submission the user is looking at
    })

    const submissionArg = mockPublishJSON.mock.calls[0][0]
    expect(submissionArg.boardId).toMatch(/^0x[0-9a-f]{64}$/) // bytes32 hash of 'programming'
    expect(submissionArg.contentRef).toBe(POST_REF) // original post object reused across hops
    expect(submissionArg.metadata.crosspost).toEqual({
      fromBoard: 'science',                         // one hop back, not 'tech'
      fromSubmissionRef: CROSSPOST1_SUB_REF,        // one hop back, not ORIGINAL_SUB_REF
    })
  })
})
