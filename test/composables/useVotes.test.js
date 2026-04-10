// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'

// Store mock — useVotes reads reactive totals/myVote from it.
const storeTotals = ref(null)
const storeMyVote = ref(null)
const mockInvalidate = vi.fn()

vi.mock('../../src/stores/votes.js', () => ({
  useVotesStore: () => ({
    getTotals: () => storeTotals.value,
    getMyVote: () => storeMyVote.value,
    invalidate: mockInvalidate,
  }),
}))

vi.mock('../../src/chain/contract.js', () => ({
  isContractConfigured: () => true,
}))

const mockSendVote = vi.fn()
vi.mock('../../src/chain/transactions.js', () => ({
  setVote: mockSendVote,
}))

const mockWaitForReceipt = vi.fn()
vi.mock('../../src/lib/rpc.js', () => ({
  waitForReceipt: mockWaitForReceipt,
}))

const mockGetUserVote = vi.fn()
vi.mock('../../src/chain/events.js', () => ({
  getUserVote: mockGetUserVote,
}))

const mockConnect = vi.fn()
vi.mock('../../src/composables/useWallet.js', () => ({
  useWallet: () => ({ connect: mockConnect }),
}))

const { useVotes, applyVoteTransition } = await import('../../src/composables/useVotes.js')
const { useAuthStore } = await import('../../src/stores/auth.js')
const { flushMicrotasks } = await import('../helpers/flushMicrotasks.js')

const REF = 'bzz://' + 'a'.repeat(64)
const VOTER = '0xAAAA000000000000000000000000000000000001'

describe('useVotes', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useAuthStore().setWallet(VOTER)
    storeTotals.value = null
    storeMyVote.value = null
    mockInvalidate.mockReset()
    mockSendVote.mockReset()
    mockWaitForReceipt.mockReset()
    mockGetUserVote.mockReset()
    mockConnect.mockReset()
  })

  it('reads totals and myVote from the store', () => {
    storeTotals.value = { upvotes: 7, downvotes: 2 }
    storeMyVote.value = 1
    const { upvotes, downvotes, score, myVote } = useVotes(REF)

    expect(upvotes.value).toBe(7)
    expect(downvotes.value).toBe(2)
    expect(score.value).toBe(5)
    expect(myVote.value).toBe(1)
  })

  it('defaults to zero when store returns null', () => {
    const { upvotes, downvotes, score, myVote } = useVotes(REF)

    expect(upvotes.value).toBe(0)
    expect(downvotes.value).toBe(0)
    expect(score.value).toBe(0)
    expect(myVote.value).toBe(0)
  })

  it('optimistic update wins over store values', async () => {
    storeTotals.value = { upvotes: 5, downvotes: 1 }
    storeMyVote.value = 0
    mockSendVote.mockResolvedValueOnce('0xtxhash')
    let resolveReceipt
    mockWaitForReceipt.mockImplementationOnce(
      () => new Promise((resolve) => { resolveReceipt = resolve }),
    )
    const { upvotes, downvotes, score, myVote, upvote } = useVotes(REF)

    const votePromise = upvote()
    // Give microtasks a chance so optimistic state is applied
    await Promise.resolve()
    expect(myVote.value).toBe(1)
    expect(upvotes.value).toBe(6)
    expect(downvotes.value).toBe(1)
    expect(score.value).toBe(5)

    resolveReceipt({ status: '0x1' })
    await votePromise
    expect(mockInvalidate).toHaveBeenCalledWith(REF)
  })

  it('toggle: clicking upvote when already upvoted sends direction 0', async () => {
    storeMyVote.value = 1
    mockSendVote.mockResolvedValueOnce('0xtxhash')
    mockWaitForReceipt.mockResolvedValueOnce({ status: '0x1' })
    const { upvote } = useVotes(REF)

    await upvote()
    expect(mockSendVote).toHaveBeenCalledWith({ submissionRef: REF, direction: 0 })
  })

  it('toggle: clicking downvote when upvoted sends direction -1', async () => {
    storeMyVote.value = 1
    mockSendVote.mockResolvedValueOnce('0xtxhash')
    mockWaitForReceipt.mockResolvedValueOnce({ status: '0x1' })
    const { downvote } = useVotes(REF)

    await downvote()
    expect(mockSendVote).toHaveBeenCalledWith({ submissionRef: REF, direction: -1 })
  })

  it('vote from fresh wallet connect uses getUserVote fallback for current direction', async () => {
    useAuthStore().clearWallet()
    mockConnect.mockImplementationOnce(async () => {
      useAuthStore().setWallet(VOTER)
    })
    mockGetUserVote.mockResolvedValueOnce(-1) // already downvoted
    mockSendVote.mockResolvedValueOnce('0xtxhash')
    mockWaitForReceipt.mockResolvedValueOnce({ status: '0x1' })

    const { downvote } = useVotes(REF)
    await downvote()

    expect(mockConnect).toHaveBeenCalledOnce()
    expect(mockGetUserVote).toHaveBeenCalledWith(REF, VOTER)
    // -1 toggles to 0 (clear), not -1 again
    expect(mockSendVote).toHaveBeenCalledWith({ submissionRef: REF, direction: 0 })
  })

  it('reverts optimistic state and sets error on receipt failure', async () => {
    storeTotals.value = { upvotes: 5, downvotes: 1 }
    storeMyVote.value = 0
    mockSendVote.mockResolvedValueOnce('0xtxhash')
    mockWaitForReceipt.mockResolvedValueOnce({ status: '0x0' })
    const { upvotes, downvotes, myVote, error, upvote } = useVotes(REF)

    await upvote()

    // Optimistic cleared, back to store values
    expect(upvotes.value).toBe(5)
    expect(downvotes.value).toBe(1)
    expect(myVote.value).toBe(0)
    expect(error.value).toMatch(/reverted/)
    expect(mockInvalidate).not.toHaveBeenCalled()
  })
})

describe('applyVoteTransition', () => {
  const T = { upvotes: 5, downvotes: 2 }

  it('0 → 1 increments upvotes', () => {
    expect(applyVoteTransition(T, 0, 1)).toEqual({ upvotes: 6, downvotes: 2 })
  })
  it('0 → -1 increments downvotes', () => {
    expect(applyVoteTransition(T, 0, -1)).toEqual({ upvotes: 5, downvotes: 3 })
  })
  it('1 → 0 decrements upvotes (clear)', () => {
    expect(applyVoteTransition(T, 1, 0)).toEqual({ upvotes: 4, downvotes: 2 })
  })
  it('-1 → 0 decrements downvotes (clear)', () => {
    expect(applyVoteTransition(T, -1, 0)).toEqual({ upvotes: 5, downvotes: 1 })
  })
  it('1 → -1 flips: -1 upvote, +1 downvote', () => {
    expect(applyVoteTransition(T, 1, -1)).toEqual({ upvotes: 4, downvotes: 3 })
  })
  it('-1 → 1 flips: +1 upvote, -1 downvote', () => {
    expect(applyVoteTransition(T, -1, 1)).toEqual({ upvotes: 6, downvotes: 1 })
  })
  it('0 → 0 no-op', () => {
    expect(applyVoteTransition(T, 0, 0)).toEqual({ upvotes: 5, downvotes: 2 })
  })
  it('1 → 1 no-op (same direction)', () => {
    expect(applyVoteTransition(T, 1, 1)).toEqual({ upvotes: 5, downvotes: 2 })
  })
  it('-1 → -1 no-op (same direction)', () => {
    expect(applyVoteTransition(T, -1, -1)).toEqual({ upvotes: 5, downvotes: 2 })
  })
})
