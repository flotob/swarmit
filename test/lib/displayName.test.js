// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { truncateAddress } from '../../src/lib/format.js'

const mockGetName = vi.fn()
vi.mock('../../src/stores/usernames.js', () => ({
  useUsernamesStore: () => ({ getName: mockGetName }),
}))

const mockFallback = vi.fn()
vi.mock('swarmit-protocol', () => ({
  addressToFallbackName: mockFallback,
}))

const { displayName } = await import('../../src/lib/displayName.js')

const ADDR = '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf'

describe('displayName precedence', () => {
  beforeEach(() => {
    mockGetName.mockReset()
    mockFallback.mockReset()
    setActivePinia(createPinia())
  })

  it('explicit name wins over everything', () => {
    expect(displayName(ADDR, 'Curator Name')).toBe('Curator Name')
    expect(mockGetName).not.toHaveBeenCalled()
    expect(mockFallback).not.toHaveBeenCalled()
  })

  it('on-chain username wins when explicit is absent', () => {
    mockGetName.mockReturnValue('alice')
    expect(displayName(ADDR)).toBe('alice')
    expect(mockFallback).not.toHaveBeenCalled()
  })

  it('falls back to deterministic name when on-chain is null', () => {
    mockGetName.mockReturnValue(null)
    mockFallback.mockReturnValue('lekni-jalfam#pl4lg')
    expect(displayName(ADDR)).toBe('lekni-jalfam#pl4lg')
    expect(mockFallback).toHaveBeenCalledWith(ADDR)
  })

  it('falls back to truncated address when fallback helper throws', () => {
    mockGetName.mockReturnValue(null)
    mockFallback.mockImplementation(() => { throw new Error('invalid') })
    expect(displayName(ADDR)).toBe(truncateAddress(ADDR))
  })

  it('returns truncated address for empty/null input', () => {
    expect(displayName(null)).toBe(truncateAddress(null))
    expect(displayName(undefined)).toBe(truncateAddress(undefined))
    expect(displayName('')).toBe(truncateAddress(''))
  })

  it('empty-string on-chain result triggers fallback (not blank label)', () => {
    mockGetName.mockReturnValue('')
    mockFallback.mockReturnValue('deterministic-name')
    expect(displayName(ADDR)).toBe('deterministic-name')
  })
})
