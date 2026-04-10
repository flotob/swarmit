import { describe, it, expect, vi, beforeEach } from 'vitest'
import { iface } from 'swarmit-protocol/chain'
import { encodeAggregate3Return, decodeAggregate3Calldata } from './helpers.js'

const CONTRACT_ADDR = '0x1111111111111111111111111111111111111111'
const MULTICALL_ADDR = '0x2222222222222222222222222222222222222222'

const mockEthCall = vi.fn()
let contractConfigured = true

vi.mock('../../src/lib/rpc.js', () => ({ ethCall: mockEthCall }))
vi.mock('../../src/chain/contract.js', () => ({
  CONTRACT_ADDRESS: CONTRACT_ADDR,
  isContractConfigured: () => contractConfigured,
}))
vi.mock('../../src/config.js', () => ({
  MULTICALL3_ADDRESS: MULTICALL_ADDR,
}))

const { getVotesBatch } = await import('../../src/chain/votes.js')

function makeRef(n) {
  return `bzz://${String(n).padStart(64, '0')}`
}

function encodeUpvoteReturn(count) {
  return iface.encodeFunctionResult('upvoteCount', [count])
}
function encodeDownvoteReturn(count) {
  return iface.encodeFunctionResult('downvoteCount', [count])
}
function encodeVoteOfReturn(direction) {
  return iface.encodeFunctionResult('voteOf', [direction])
}

describe('getVotesBatch', () => {
  beforeEach(() => {
    mockEthCall.mockReset()
    contractConfigured = true
  })

  it('returns empty maps for empty input without RPC call', async () => {
    const result = await getVotesBatch([])
    expect(result.totals.size).toBe(0)
    expect(result.myVotes.size).toBe(0)
    expect(mockEthCall).not.toHaveBeenCalled()
  })

  it('returns empty maps when contract is not configured', async () => {
    contractConfigured = false
    const result = await getVotesBatch([makeRef(1), makeRef(2)])
    expect(result.totals.size).toBe(0)
    expect(result.myVotes.size).toBe(0)
    expect(mockEthCall).not.toHaveBeenCalled()
  })

  it('batches N refs into one multicall with 2N calls (no voter)', async () => {
    const refs = [makeRef(1), makeRef(2), makeRef(3)]
    mockEthCall.mockResolvedValueOnce(
      encodeAggregate3Return([
        [true, encodeUpvoteReturn(5)],
        [true, encodeDownvoteReturn(1)],
        [true, encodeUpvoteReturn(10)],
        [true, encodeDownvoteReturn(2)],
        [true, encodeUpvoteReturn(0)],
        [true, encodeDownvoteReturn(0)],
      ]),
    )

    const result = await getVotesBatch(refs)
    expect(mockEthCall).toHaveBeenCalledOnce()
    expect(mockEthCall.mock.calls[0][0].to).toBe(MULTICALL_ADDR)
    expect(result.totals.get(refs[0].toLowerCase())).toEqual({ upvotes: 5, downvotes: 1 })
    expect(result.totals.get(refs[1].toLowerCase())).toEqual({ upvotes: 10, downvotes: 2 })
    expect(result.totals.get(refs[2].toLowerCase())).toEqual({ upvotes: 0, downvotes: 0 })
    expect(result.myVotes.size).toBe(0)
  })

  it('batches N refs into one multicall with 3N calls (with voter)', async () => {
    const voter = '0xAAAA000000000000000000000000000000000001'
    const refs = [makeRef(1), makeRef(2)]
    mockEthCall.mockResolvedValueOnce(
      encodeAggregate3Return([
        [true, encodeUpvoteReturn(3)],
        [true, encodeDownvoteReturn(0)],
        [true, encodeVoteOfReturn(1)],
        [true, encodeUpvoteReturn(7)],
        [true, encodeDownvoteReturn(4)],
        [true, encodeVoteOfReturn(-1)],
      ]),
    )

    const result = await getVotesBatch(refs, voter)
    expect(mockEthCall).toHaveBeenCalledOnce()
    expect(result.totals.get(refs[0].toLowerCase())).toEqual({ upvotes: 3, downvotes: 0 })
    expect(result.totals.get(refs[1].toLowerCase())).toEqual({ upvotes: 7, downvotes: 4 })
    expect(result.myVotes.get(refs[0].toLowerCase())).toBe(1)
    expect(result.myVotes.get(refs[1].toLowerCase())).toBe(-1)
  })

  it('dedupes refs case-insensitively', async () => {
    const refs = [makeRef(1), makeRef(1).toUpperCase(), makeRef(1)]
    mockEthCall.mockResolvedValueOnce(
      encodeAggregate3Return([
        [true, encodeUpvoteReturn(5)],
        [true, encodeDownvoteReturn(1)],
      ]),
    )

    const result = await getVotesBatch(refs)
    expect(mockEthCall).toHaveBeenCalledOnce()
    const decoded = decodeAggregate3Calldata(mockEthCall.mock.calls[0][0].data)
    expect(decoded[0].length).toBe(2)
    expect(result.totals.size).toBe(1)
  })

  it('maps failed calls to zeros', async () => {
    const refs = [makeRef(1), makeRef(2)]
    mockEthCall.mockResolvedValueOnce(
      encodeAggregate3Return([
        [true, encodeUpvoteReturn(5)],
        [true, encodeDownvoteReturn(1)],
        [false, '0x'],
        [false, '0x'],
      ]),
    )

    const result = await getVotesBatch(refs)
    expect(result.totals.get(refs[0].toLowerCase())).toEqual({ upvotes: 5, downvotes: 1 })
    expect(result.totals.get(refs[1].toLowerCase())).toEqual({ upvotes: 0, downvotes: 0 })
  })

  it('skips null/undefined entries', async () => {
    mockEthCall.mockResolvedValueOnce(
      encodeAggregate3Return([
        [true, encodeUpvoteReturn(5)],
        [true, encodeDownvoteReturn(1)],
      ]),
    )

    const result = await getVotesBatch([null, makeRef(1), undefined])
    expect(result.totals.size).toBe(1)
    expect(result.totals.get(makeRef(1).toLowerCase())).toEqual({ upvotes: 5, downvotes: 1 })
  })

  it('chunks large batches: 100 refs with voter = 300 calls → 2 chunks', async () => {
    // MAX_BATCH_SIZE=250, callsPerRef=3, refsPerChunk=floor(250/3)=83
    // 100 refs → 83 + 17
    const refs = Array.from({ length: 100 }, (_, i) => makeRef(i + 1))
    const voter = '0xBBBB000000000000000000000000000000000001'

    const chunk1Results = []
    for (let i = 0; i < 83; i++) {
      chunk1Results.push([true, encodeUpvoteReturn(0)])
      chunk1Results.push([true, encodeDownvoteReturn(0)])
      chunk1Results.push([true, encodeVoteOfReturn(0)])
    }
    const chunk2Results = []
    for (let i = 0; i < 17; i++) {
      chunk2Results.push([true, encodeUpvoteReturn(0)])
      chunk2Results.push([true, encodeDownvoteReturn(0)])
      chunk2Results.push([true, encodeVoteOfReturn(0)])
    }

    mockEthCall
      .mockResolvedValueOnce(encodeAggregate3Return(chunk1Results))
      .mockResolvedValueOnce(encodeAggregate3Return(chunk2Results))

    const result = await getVotesBatch(refs, voter)
    expect(mockEthCall).toHaveBeenCalledTimes(2)
    expect(result.totals.size).toBe(100)
    expect(result.myVotes.size).toBe(100)
  })
})
