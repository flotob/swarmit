import { describe, it, expect, vi, beforeEach } from 'vitest'
import { iface as registryIface } from 'swarmit-protocol/username-registry'

// Placeholder addresses — the test mocks the config module, so any valid
// hex address works. Real deployment addresses live in .env.
const REGISTRY_ADDR = '0x1111111111111111111111111111111111111111'
const MULTICALL_ADDR = '0x2222222222222222222222222222222222222222'

// Mock rpc, ethereum, and config BEFORE importing the module under test
const mockEthCall = vi.fn()
const mockGetLogs = vi.fn()
const mockSendTransaction = vi.fn()
let registryConfigured = true
vi.mock('../../src/lib/rpc.js', () => ({
  ethCall: mockEthCall,
  getLogs: mockGetLogs,
}))
vi.mock('../../src/lib/ethereum.js', () => ({ sendTransaction: mockSendTransaction }))
vi.mock('../../src/config.js', () => ({
  USERNAME_REGISTRY_ADDRESS: REGISTRY_ADDR,
  USERNAME_REGISTRY_DEPLOY_BLOCK: '0x64',
  MULTICALL3_ADDRESS: MULTICALL_ADDR,
  isUsernameRegistryConfigured: () => registryConfigured,
}))

const {
  getPrimaryName,
  getPrimaryNames,
  getCurrentUsernamePrice,
  claimUsername,
  setPrimaryUsername,
} = await import('../../src/chain/username-registry.js')
const { multicallIface } = await import('../../src/chain/multicall.js')

function encodePrimaryNameReturn(name) {
  return registryIface.encodeFunctionResult('primaryNameOf', [name])
}

function encodeAggregate3Return(results) {
  return multicallIface.encodeFunctionResult('aggregate3', [results])
}

describe('getPrimaryName', () => {
  beforeEach(() => {
    mockEthCall.mockReset()
    registryConfigured = true
  })

  it('fetches and decodes a single primary name', async () => {
    mockEthCall.mockResolvedValueOnce(encodePrimaryNameReturn('alice'))
    const name = await getPrimaryName('0xaaaa000000000000000000000000000000000001')
    expect(name).toBe('alice')
    expect(mockEthCall).toHaveBeenCalledOnce()
    expect(mockEthCall.mock.calls[0][0].to).toBe(REGISTRY_ADDR)
  })

  it('returns empty string when address has no primary name', async () => {
    mockEthCall.mockResolvedValueOnce(encodePrimaryNameReturn(''))
    const name = await getPrimaryName('0xaaaa000000000000000000000000000000000001')
    expect(name).toBe('')
  })

  it('returns empty string for falsy input', async () => {
    expect(await getPrimaryName(null)).toBe('')
    expect(await getPrimaryName('')).toBe('')
    expect(mockEthCall).not.toHaveBeenCalled()
  })

  it('returns empty string without RPC call when registry is not configured', async () => {
    registryConfigured = false
    expect(await getPrimaryName('0xaaaa000000000000000000000000000000000001')).toBe('')
    expect(mockEthCall).not.toHaveBeenCalled()
  })
})

describe('getPrimaryNames', () => {
  beforeEach(() => {
    mockEthCall.mockReset()
    registryConfigured = true
  })

  it('returns empty map for empty input without RPC call', async () => {
    const result = await getPrimaryNames([])
    expect(result.size).toBe(0)
    expect(mockEthCall).not.toHaveBeenCalled()
  })

  it('batches multiple addresses into one Multicall3 call', async () => {
    const addrs = [
      '0xaaaa000000000000000000000000000000000001',
      '0xbbbb000000000000000000000000000000000002',
      '0xcccc000000000000000000000000000000000003',
    ]
    mockEthCall.mockResolvedValueOnce(
      encodeAggregate3Return([
        [true, encodePrimaryNameReturn('alice')],
        [true, encodePrimaryNameReturn('bob')],
        [true, encodePrimaryNameReturn('')],
      ]),
    )

    const result = await getPrimaryNames(addrs)

    expect(mockEthCall).toHaveBeenCalledOnce()
    expect(mockEthCall.mock.calls[0][0].to).toBe(MULTICALL_ADDR)
    expect(result.get('0xaaaa000000000000000000000000000000000001')).toBe('alice')
    expect(result.get('0xbbbb000000000000000000000000000000000002')).toBe('bob')
    expect(result.get('0xcccc000000000000000000000000000000000003')).toBe('')
  })

  it('deduplicates addresses case-insensitively', async () => {
    mockEthCall.mockResolvedValueOnce(
      encodeAggregate3Return([[true, encodePrimaryNameReturn('alice')]]),
    )

    const result = await getPrimaryNames([
      '0xAAAA000000000000000000000000000000000001',
      '0xaaaa000000000000000000000000000000000001',
      '0xAaAa000000000000000000000000000000000001',
    ])

    expect(mockEthCall).toHaveBeenCalledOnce()
    const callArgs = multicallIface.decodeFunctionData(
      'aggregate3',
      mockEthCall.mock.calls[0][0].data,
    )
    expect(callArgs[0].length).toBe(1)
    expect(result.size).toBe(1)
    expect(result.get('0xaaaa000000000000000000000000000000000001')).toBe('alice')
  })

  it('maps failed calls to empty string', async () => {
    mockEthCall.mockResolvedValueOnce(
      encodeAggregate3Return([
        [true, encodePrimaryNameReturn('alice')],
        [false, '0x'],
      ]),
    )

    const result = await getPrimaryNames([
      '0xaaaa000000000000000000000000000000000001',
      '0xbbbb000000000000000000000000000000000002',
    ])

    expect(result.get('0xaaaa000000000000000000000000000000000001')).toBe('alice')
    expect(result.get('0xbbbb000000000000000000000000000000000002')).toBe('')
  })

  it('skips null/undefined entries', async () => {
    mockEthCall.mockResolvedValueOnce(
      encodeAggregate3Return([[true, encodePrimaryNameReturn('alice')]]),
    )

    const result = await getPrimaryNames([
      null,
      '0xaaaa000000000000000000000000000000000001',
      undefined,
    ])

    expect(result.size).toBe(1)
    expect(result.get('0xaaaa000000000000000000000000000000000001')).toBe('alice')
  })

  it('returns empty map without RPC call when registry is not configured', async () => {
    registryConfigured = false
    const result = await getPrimaryNames(['0xaaaa000000000000000000000000000000000001'])
    expect(result.size).toBe(0)
    expect(mockEthCall).not.toHaveBeenCalled()
  })

  it('chunks large batches into multiple Multicall3 calls', async () => {
    // Build 301 addresses → should produce 2 chunks (250 + 51)
    const addrs = Array.from({ length: 301 }, (_, i) =>
      '0x' + (i + 1).toString(16).padStart(40, '0'),
    )
    mockEthCall
      .mockResolvedValueOnce(
        encodeAggregate3Return(
          Array.from({ length: 250 }, () => [true, encodePrimaryNameReturn('')]),
        ),
      )
      .mockResolvedValueOnce(
        encodeAggregate3Return(
          Array.from({ length: 51 }, () => [true, encodePrimaryNameReturn('')]),
        ),
      )

    const result = await getPrimaryNames(addrs)
    expect(mockEthCall).toHaveBeenCalledTimes(2)
    expect(result.size).toBe(301)
  })
})

describe('getCurrentUsernamePrice', () => {
  beforeEach(() => {
    mockEthCall.mockReset()
    registryConfigured = true
  })

  it('returns 0n without RPC call when registry is not configured', async () => {
    registryConfigured = false
    expect(await getCurrentUsernamePrice()).toBe(0n)
    expect(mockEthCall).not.toHaveBeenCalled()
  })

  it('returns the current mint price as a bigint', async () => {
    const encoded = registryIface.encodeFunctionResult('currentMintPrice', [1500000000000000n])
    mockEthCall.mockResolvedValueOnce(encoded)

    const price = await getCurrentUsernamePrice()
    expect(price).toBe(1500000000000000n)
    expect(typeof price).toBe('bigint')
  })
})

describe('claimUsername', () => {
  beforeEach(() => {
    mockSendTransaction.mockReset()
    registryConfigured = true
  })

  it('sends a tx with calldata and value=maxPriceWei', async () => {
    mockSendTransaction.mockResolvedValueOnce('0xtxhash')
    const hash = await claimUsername({ name: 'alice', maxPriceWei: 1500000000000000n })

    expect(hash).toBe('0xtxhash')
    expect(mockSendTransaction).toHaveBeenCalledOnce()
    const arg = mockSendTransaction.mock.calls[0][0]
    expect(arg.to).toBe(REGISTRY_ADDR)
    expect(arg.value).toBe('0x5543df729c000')
    expect(arg.data.slice(0, 10)).toBe('0xe64d2fb4') // claim selector
  })

  it('throws when registry is not configured', async () => {
    registryConfigured = false
    await expect(claimUsername({ name: 'alice', maxPriceWei: 1n })).rejects.toThrow(/not configured/)
    expect(mockSendTransaction).not.toHaveBeenCalled()
  })
})

describe('setPrimaryUsername', () => {
  beforeEach(() => {
    mockSendTransaction.mockReset()
    registryConfigured = true
  })

  it('sends a tx with setPrimaryName calldata', async () => {
    mockSendTransaction.mockResolvedValueOnce('0xtxhash')
    const hash = await setPrimaryUsername(42n)

    expect(hash).toBe('0xtxhash')
    const arg = mockSendTransaction.mock.calls[0][0]
    expect(arg.to).toBe(REGISTRY_ADDR)
    expect(arg.data.slice(0, 10)).toBe('0xa4f69657') // setPrimaryName selector
  })

  it('throws when registry is not configured', async () => {
    registryConfigured = false
    await expect(setPrimaryUsername(1n)).rejects.toThrow(/not configured/)
  })
})
