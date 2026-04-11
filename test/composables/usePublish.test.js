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
vi.mock('../../src/composables/useSwarm.js', () => ({
  useSwarm: () => ({
    connect: mockSwarmConnect,
    publishJSON: mockPublishJSON,
    ensureUserFeed: mockEnsureUserFeed,
    updateFeed: mockUpdateFeed,
  }),
}))

const mockResolveFeed = vi.fn()
vi.mock('../../src/swarm/feeds.js', () => ({
  resolveFeed: mockResolveFeed,
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
const USER_FEED = 'bzz://' + 'f'.repeat(64)
const POST_REF = 'bzz://' + 'a'.repeat(64)                 // the original post content
const ORIGINAL_SUB_REF = 'bzz://' + 'b'.repeat(64)          // submission in r/tech
const CROSSPOST1_SUB_REF = 'bzz://' + 'c'.repeat(64)        // crosspost → r/science
const CROSSPOST2_SUB_REF = 'bzz://' + 'd'.repeat(64)        // crosspost of crosspost → r/programming
const USER_FEED_INDEX_REF = 'bzz://' + 'e'.repeat(64)

function nextRef(bzzRef) {
  return { reference: bzzRef.slice(6), bzzUrl: bzzRef }
}

describe('usePublish.publishCrosspost', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const auth = useAuthStore()
    auth.setWallet(USER)
    auth.setSwarmConnected(true)
    auth.setUserFeed(USER_FEED)

    mockWalletConnect.mockReset()
    mockSwarmConnect.mockReset()
    mockPublishJSON.mockReset()
    mockEnsureUserFeed.mockReset().mockResolvedValue(USER_FEED)
    mockUpdateFeed.mockReset().mockResolvedValue(undefined)
    mockResolveFeed.mockReset().mockResolvedValue(null)
    mockAnnounceSubmission.mockReset().mockResolvedValue('0xdeadbeef')
  })

  it('publishes a new submission reusing the existing contentRef (no content publish)', async () => {
    // publishJSON will be called twice: once for the submission, once for the user feed index
    mockPublishJSON
      .mockResolvedValueOnce(nextRef(CROSSPOST1_SUB_REF))
      .mockResolvedValueOnce(nextRef(USER_FEED_INDEX_REF))

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

    // No separate "publish post" call — submission (1st) + user feed index (2nd) only
    expect(mockPublishJSON).toHaveBeenCalledTimes(2)

    const submissionArg = mockPublishJSON.mock.calls[0][0]
    expect(submissionArg.protocol).toBe('freedom-board/submission/v1')
    expect(submissionArg.boardId).toBe('science')
    expect(submissionArg.kind).toBe('post')
    expect(submissionArg.contentRef).toBe(POST_REF)
    expect(submissionArg.author.address).toBe(USER)
    expect(submissionArg.metadata).toEqual({
      crosspost: {
        fromBoard: 'tech',
        fromSubmissionRef: ORIGINAL_SUB_REF,
      },
    })
  })

  it('announces the new submission on-chain with the target boardSlug', async () => {
    mockPublishJSON
      .mockResolvedValueOnce(nextRef(CROSSPOST1_SUB_REF))
      .mockResolvedValueOnce(nextRef(USER_FEED_INDEX_REF))

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
    mockPublishJSON
      .mockResolvedValueOnce(nextRef(CROSSPOST2_SUB_REF))
      .mockResolvedValueOnce(nextRef(USER_FEED_INDEX_REF))

    const { publishCrosspost } = usePublish()

    await publishCrosspost({
      targetBoardSlug: 'programming',
      contentRef: POST_REF,                         // same original post object
      sourceBoardSlug: 'science',                   // the board the user is crossposting FROM
      sourceSubmissionRef: CROSSPOST1_SUB_REF,      // the submission the user is looking at
    })

    const submissionArg = mockPublishJSON.mock.calls[0][0]
    expect(submissionArg.boardId).toBe('programming')
    expect(submissionArg.contentRef).toBe(POST_REF) // original post object reused across hops
    expect(submissionArg.metadata.crosspost).toEqual({
      fromBoard: 'science',                         // one hop back, not 'tech'
      fromSubmissionRef: CROSSPOST1_SUB_REF,        // one hop back, not ORIGINAL_SUB_REF
    })
  })
})
