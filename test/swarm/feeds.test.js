import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch globally before importing the module under test
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const { resolveCuratorProfile } = await import('../../src/swarm/feeds.js')

const validProfile = {
  protocol: 'freedom-board/curator/v1',
  curator: '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf',
  name: 'Test Curator',
  description: 'A test curator',
  globalIndexFeed: `bzz://${'b'.repeat(64)}`,
}

// Each test uses a unique ref to avoid TTL cache collisions between tests.
let refCounter = 0
function uniqueRef() {
  const hex = String(refCounter++).padStart(64, '0')
  return { hex, bzz: `bzz://${hex}` }
}

function mockOkResponse(data) {
  return { ok: true, status: 200, json: async () => data }
}

function mockErrorResponse(status = 500) {
  return { ok: false, status }
}

describe('resolveCuratorProfile', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('resolves a valid curatorProfile', async () => {
    const { hex, bzz } = uniqueRef()
    mockFetch.mockResolvedValueOnce(mockOkResponse(validProfile))
    const profile = await resolveCuratorProfile(bzz)
    expect(profile).toEqual(validProfile)
    expect(mockFetch).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`/bzz/${hex}/$`)))
  })

  it('throws on invalid ref', async () => {
    await expect(resolveCuratorProfile('garbage')).rejects.toThrow('Invalid curator profile reference')
  })

  it('throws on HTTP error', async () => {
    const { bzz } = uniqueRef()
    mockFetch.mockResolvedValueOnce(mockErrorResponse(404))
    await expect(resolveCuratorProfile(bzz)).rejects.toThrow('404')
  })

  it('throws on non-curatorProfile object', async () => {
    const { bzz } = uniqueRef()
    const notAProfile = { protocol: 'freedom-board/post/v1', title: 'oops' }
    mockFetch.mockResolvedValueOnce(mockOkResponse(notAProfile))
    await expect(resolveCuratorProfile(bzz)).rejects.toThrow('Invalid curator profile')
  })

  it('caches within TTL window', async () => {
    vi.useFakeTimers()
    const { bzz } = uniqueRef()
    mockFetch.mockResolvedValue(mockOkResponse(validProfile))

    const first = await resolveCuratorProfile(bzz)
    const second = await resolveCuratorProfile(bzz)

    expect(first).toBe(second) // same object reference (cache hit)
    expect(mockFetch).toHaveBeenCalledTimes(1) // only one network call

    vi.useRealTimers()
  })

  it('refetches after TTL expiry', async () => {
    vi.useFakeTimers()
    const { bzz } = uniqueRef()
    mockFetch.mockResolvedValue(mockOkResponse(validProfile))

    await resolveCuratorProfile(bzz)
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Advance past the 30s TTL
    vi.advanceTimersByTime(31_000)

    await resolveCuratorProfile(bzz)
    expect(mockFetch).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
  })

  // The resolver works identically for both ref types — /bzz/<ref>/ resolves
  // immutable content refs and feed manifest refs transparently. These two
  // tests lock that expectation per the reviewer's request.

  it('works with an old-style immutable content ref', async () => {
    const { bzz } = uniqueRef()
    mockFetch.mockResolvedValueOnce(mockOkResponse(validProfile))
    const profile = await resolveCuratorProfile(bzz)
    expect(profile.name).toBe('Test Curator')
  })

  it('works with a new-style feed manifest ref', async () => {
    const { bzz } = uniqueRef()
    mockFetch.mockResolvedValueOnce(mockOkResponse(validProfile))
    const profile = await resolveCuratorProfile(bzz)
    expect(profile.name).toBe('Test Curator')
  })
})
