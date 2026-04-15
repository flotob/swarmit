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

function encodeVoteStatsReturn(upvotes, downvotes, direction) {
  return iface.encodeFunctionResult('voteStats', [upvotes, downvotes, direction])
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

  it('batches N refs into one multicall with N calls (1 voteStats per ref)', async () => {
    const refs = [makeRef(1), makeRef(2), makeRef(3)]
    mockEthCall.mockResolvedValueOnce(
      encodeAggregate3Return([
        [true, encodeVoteStatsReturn(5, 1, 0)],
        [true, encodeVoteStatsReturn(10, 2, 0)],
        [true, encodeVoteStatsReturn(0, 0, 0)],
      ]),
    )

    const result = await getVotesBatch(refs)
    expect(mockEthCall).toHaveBeenCalledOnce()
    expect(result.totals.get(refs[0].toLowerCase())).toEqual({ upvotes: 5, downvotes: 1 })
    expect(result.totals.get(refs[1].toLowerCase())).toEqual({ upvotes: 10, downvotes: 2 })
    expect(result.totals.get(refs[2].toLowerCase())).toEqual({ upvotes: 0, downvotes: 0 })
    expect(result.myVotes.size).toBe(0)
  })

  it('includes myVotes when voter is provided', async () => {
    const voter = '0xAAAA000000000000000000000000000000000001'
    const refs = [makeRef(1), makeRef(2)]
    mockEthCall.mockResolvedValueOnce(
      encodeAggregate3Return([
        [true, encodeVoteStatsReturn(3, 0, 1)],
        [true, encodeVoteStatsReturn(7, 4, -1)],
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
        [true, encodeVoteStatsReturn(5, 1, 0)],
      ]),
    )

    const result = await getVotesBatch(refs)
    expect(mockEthCall).toHaveBeenCalledOnce()
    const decoded = decodeAggregate3Calldata(mockEthCall.mock.calls[0][0].data)
    expect(decoded[0].length).toBe(1)
    expect(result.totals.size).toBe(1)
  })

  it('maps failed calls to zeros', async () => {
    const refs = [makeRef(1), makeRef(2)]
    mockEthCall.mockResolvedValueOnce(
      encodeAggregate3Return([
        [true, encodeVoteStatsReturn(5, 1, 1)],
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
        [true, encodeVoteStatsReturn(5, 1, 0)],
      ]),
    )

    const result = await getVotesBatch([null, makeRef(1), undefined])
    expect(result.totals.size).toBe(1)
    expect(result.totals.get(makeRef(1).toLowerCase())).toEqual({ upvotes: 5, downvotes: 1 })
  })

  it('chunks large batches at MAX_BATCH_SIZE boundary', async () => {
    // MAX_BATCH_SIZE=250, 1 call per ref → 250 refs per chunk
    // 300 refs → 250 + 50
    const refs = Array.from({ length: 300 }, (_, i) => makeRef(i + 1))
    const voter = '0xBBBB000000000000000000000000000000000001'

    const chunk1 = Array.from({ length: 250 }, () => [true, encodeVoteStatsReturn(0, 0, 0)])
    const chunk2 = Array.from({ length: 50 }, () => [true, encodeVoteStatsReturn(0, 0, 0)])

    mockEthCall
      .mockResolvedValueOnce(encodeAggregate3Return(chunk1))
      .mockResolvedValueOnce(encodeAggregate3Return(chunk2))

    const result = await getVotesBatch(refs, voter)
    expect(mockEthCall).toHaveBeenCalledTimes(2)
    expect(result.totals.size).toBe(300)
    expect(result.myVotes.size).toBe(300)
  })
})
