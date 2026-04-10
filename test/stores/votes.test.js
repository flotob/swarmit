// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const mockGetVotesBatch = vi.fn()
let contractConfigured = true

vi.mock('../../src/chain/votes.js', () => ({
  getVotesBatch: mockGetVotesBatch,
}))
vi.mock('../../src/chain/contract.js', () => ({
  isContractConfigured: () => contractConfigured,
}))

const { useVotesStore } = await import('../../src/stores/votes.js')
const { useAuthStore } = await import('../../src/stores/auth.js')

function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

const REF_A = 'bzz://' + 'a'.repeat(64)
const REF_B = 'bzz://' + 'b'.repeat(64)
const VOTER = '0xAAAA000000000000000000000000000000000001'

describe('votes store', () => {
  beforeEach(() => {
    mockGetVotesBatch.mockReset()
    contractConfigured = true
    setActivePinia(createPinia())
    useAuthStore().setWallet(VOTER)
  })

  it('returns null on first access and enqueues', async () => {
    mockGetVotesBatch.mockResolvedValueOnce({
      totals: new Map([[REF_A.toLowerCase(), { upvotes: 5, downvotes: 1 }]]),
      myVotes: new Map(),
    })
    const store = useVotesStore()

    expect(store.getTotals(REF_A)).toBeNull()
    await flushMicrotasks()
    expect(mockGetVotesBatch).toHaveBeenCalledOnce()
    expect(store.getTotals(REF_A)).toEqual({ upvotes: 5, downvotes: 1 })
  })

  it('batches multiple sync calls into one flush', async () => {
    mockGetVotesBatch.mockResolvedValueOnce({
      totals: new Map([
        [REF_A.toLowerCase(), { upvotes: 5, downvotes: 1 }],
        [REF_B.toLowerCase(), { upvotes: 10, downvotes: 0 }],
      ]),
      myVotes: new Map(),
    })
    const store = useVotesStore()

    store.getTotals(REF_A)
    store.getTotals(REF_B)
    store.getTotals(REF_A) // duplicate → no-op
    await flushMicrotasks()

    expect(mockGetVotesBatch).toHaveBeenCalledOnce()
    const refsPassed = mockGetVotesBatch.mock.calls[0][0].sort()
    expect(refsPassed).toEqual([REF_A.toLowerCase(), REF_B.toLowerCase()])
  })

  it('getMyVote returns null when no wallet is connected', async () => {
    useAuthStore().clearWallet()
    const store = useVotesStore()

    expect(store.getMyVote(REF_A)).toBeNull()
    await flushMicrotasks()
    expect(mockGetVotesBatch).not.toHaveBeenCalled()
  })

  it('getMyVote enqueues and fetches using the connected wallet', async () => {
    mockGetVotesBatch.mockResolvedValueOnce({
      totals: new Map(),
      myVotes: new Map([[REF_A.toLowerCase(), 1]]),
    })
    const store = useVotesStore()

    expect(store.getMyVote(REF_A)).toBeNull()
    await flushMicrotasks()
    expect(mockGetVotesBatch).toHaveBeenCalledOnce()
    expect(mockGetVotesBatch.mock.calls[0][1]).toBe(VOTER)
    expect(store.getMyVote(REF_A)).toBe(1)
  })

  it('mixed batch: totals + myVotes in one multicall', async () => {
    mockGetVotesBatch.mockResolvedValueOnce({
      totals: new Map([
        [REF_A.toLowerCase(), { upvotes: 5, downvotes: 1 }],
        [REF_B.toLowerCase(), { upvotes: 10, downvotes: 0 }],
      ]),
      myVotes: new Map([
        [REF_A.toLowerCase(), 1],
        [REF_B.toLowerCase(), -1],
      ]),
    })
    const store = useVotesStore()

    store.getTotals(REF_A)
    store.getMyVote(REF_B)
    store.getTotals(REF_B)
    store.getMyVote(REF_A)
    await flushMicrotasks()

    expect(mockGetVotesBatch).toHaveBeenCalledOnce()
    expect(store.getTotals(REF_A)).toEqual({ upvotes: 5, downvotes: 1 })
    expect(store.getTotals(REF_B)).toEqual({ upvotes: 10, downvotes: 0 })
    expect(store.getMyVote(REF_A)).toBe(1)
    expect(store.getMyVote(REF_B)).toBe(-1)
  })

  it('caches within TTL (no refetch)', async () => {
    mockGetVotesBatch.mockResolvedValueOnce({
      totals: new Map([[REF_A.toLowerCase(), { upvotes: 5, downvotes: 1 }]]),
      myVotes: new Map(),
    })
    const store = useVotesStore()

    store.getTotals(REF_A)
    await flushMicrotasks()
    expect(store.getTotals(REF_A)).toEqual({ upvotes: 5, downvotes: 1 })

    store.getTotals(REF_A)
    await flushMicrotasks()
    expect(mockGetVotesBatch).toHaveBeenCalledOnce()
  })

  it('caches zero totals (no refetch on next access)', async () => {
    mockGetVotesBatch.mockResolvedValueOnce({
      totals: new Map([[REF_A.toLowerCase(), { upvotes: 0, downvotes: 0 }]]),
      myVotes: new Map(),
    })
    const store = useVotesStore()

    store.getTotals(REF_A)
    await flushMicrotasks()
    expect(store.getTotals(REF_A)).toEqual({ upvotes: 0, downvotes: 0 })

    store.getTotals(REF_A)
    await flushMicrotasks()
    expect(mockGetVotesBatch).toHaveBeenCalledOnce()
  })

  it('invalidate(ref) drops totals and allows refetch', async () => {
    mockGetVotesBatch
      .mockResolvedValueOnce({
        totals: new Map([[REF_A.toLowerCase(), { upvotes: 5, downvotes: 1 }]]),
        myVotes: new Map(),
      })
      .mockResolvedValueOnce({
        totals: new Map([[REF_A.toLowerCase(), { upvotes: 6, downvotes: 1 }]]),
        myVotes: new Map(),
      })
    const store = useVotesStore()

    store.getTotals(REF_A)
    await flushMicrotasks()
    expect(store.getTotals(REF_A)).toEqual({ upvotes: 5, downvotes: 1 })

    store.invalidate(REF_A)
    expect(store.getTotals(REF_A)).toBeNull()
    await flushMicrotasks()
    expect(store.getTotals(REF_A)).toEqual({ upvotes: 6, downvotes: 1 })
    expect(mockGetVotesBatch).toHaveBeenCalledTimes(2)
  })

  it('invalidate(ref) drops both totals and myVote for the ref', async () => {
    mockGetVotesBatch.mockResolvedValue({
      totals: new Map([[REF_A.toLowerCase(), { upvotes: 5, downvotes: 0 }]]),
      myVotes: new Map([[REF_A.toLowerCase(), 1]]),
    })
    const store = useVotesStore()

    store.getTotals(REF_A)
    store.getMyVote(REF_A)
    await flushMicrotasks()

    store.invalidate(REF_A)
    expect(store.getTotals(REF_A)).toBeNull()
    expect(store.getMyVote(REF_A)).toBeNull()
  })

  it('returns null without enqueueing when contract is not configured', async () => {
    contractConfigured = false
    const store = useVotesStore()

    expect(store.getTotals(REF_A)).toBeNull()
    expect(store.getMyVote(REF_A)).toBeNull()
    await flushMicrotasks()
    expect(mockGetVotesBatch).not.toHaveBeenCalled()
  })

  it('fetch error leaves entries unset for retry', async () => {
    mockGetVotesBatch.mockRejectedValueOnce(new Error('rpc failed'))
    const store = useVotesStore()

    store.getTotals(REF_A)
    await flushMicrotasks()
    expect(store.getTotals(REF_A)).toBeNull()

    mockGetVotesBatch.mockResolvedValueOnce({
      totals: new Map([[REF_A.toLowerCase(), { upvotes: 3, downvotes: 0 }]]),
      myVotes: new Map(),
    })
    await flushMicrotasks()
    expect(store.getTotals(REF_A)).toEqual({ upvotes: 3, downvotes: 0 })
  })

  it('wallet change invalidates all myVote entries', async () => {
    mockGetVotesBatch.mockResolvedValue({
      totals: new Map(),
      myVotes: new Map([[REF_A.toLowerCase(), 1]]),
    })
    const store = useVotesStore()

    store.getMyVote(REF_A)
    await flushMicrotasks()
    expect(store.getMyVote(REF_A)).toBe(1)

    useAuthStore().setWallet('0xBBBB000000000000000000000000000000000002')
    await flushMicrotasks()
    // Old entry was cleared on wallet change → next read re-enqueues and returns null
    expect(store.getMyVote(REF_A)).toBeNull()
  })
})
