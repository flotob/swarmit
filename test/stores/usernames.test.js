// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const mockGetPrimaryNames = vi.fn()
let registryConfigured = true

vi.mock('../../src/chain/username-registry.js', () => ({
  getPrimaryNames: mockGetPrimaryNames,
  isUsernameRegistryConfigured: () => registryConfigured,
}))

const { useUsernamesStore } = await import('../../src/stores/usernames.js')
const { flushMicrotasks } = await import('../helpers/flushMicrotasks.js')

describe('usernames store', () => {
  beforeEach(() => {
    mockGetPrimaryNames.mockReset()
    registryConfigured = true
    setActivePinia(createPinia())
  })

  it('returns null and enqueues on first access', async () => {
    mockGetPrimaryNames.mockResolvedValueOnce(new Map([['0xaaa', 'alice']]))
    const store = useUsernamesStore()

    const initial = store.getName('0xAAA')
    expect(initial).toBeNull()

    await flushMicrotasks()
    expect(mockGetPrimaryNames).toHaveBeenCalledOnce()
    expect(mockGetPrimaryNames.mock.calls[0][0]).toEqual(['0xaaa'])

    const second = store.getName('0xAAA')
    expect(second).toBe('alice')
  })

  it('batches multiple sync calls into one flush', async () => {
    mockGetPrimaryNames.mockResolvedValueOnce(
      new Map([
        ['0xaaa', 'alice'],
        ['0xbbb', 'bob'],
        ['0xccc', ''],
      ]),
    )
    const store = useUsernamesStore()

    store.getName('0xAAA')
    store.getName('0xBBB')
    store.getName('0xCCC')
    store.getName('0xAAA') // duplicate — should not re-enqueue

    await flushMicrotasks()
    expect(mockGetPrimaryNames).toHaveBeenCalledOnce()
    expect(mockGetPrimaryNames.mock.calls[0][0].sort()).toEqual(['0xaaa', '0xbbb', '0xccc'])

    expect(store.getName('0xAAA')).toBe('alice')
    expect(store.getName('0xBBB')).toBe('bob')
    expect(store.getName('0xCCC')).toBeNull()
  })

  it('caches negative results (no refetch within TTL)', async () => {
    mockGetPrimaryNames.mockResolvedValueOnce(new Map([['0xaaa', '']]))
    const store = useUsernamesStore()

    store.getName('0xAAA')
    await flushMicrotasks()
    expect(store.getName('0xAAA')).toBeNull()

    // Second access within TTL — no new fetch
    store.getName('0xAAA')
    await flushMicrotasks()
    expect(mockGetPrimaryNames).toHaveBeenCalledOnce()
  })

  it('invalidate drops the cached entry and allows refetch', async () => {
    mockGetPrimaryNames
      .mockResolvedValueOnce(new Map([['0xaaa', 'alice']]))
      .mockResolvedValueOnce(new Map([['0xaaa', 'alice-v2']]))
    const store = useUsernamesStore()

    store.getName('0xAAA')
    await flushMicrotasks()
    expect(store.getName('0xAAA')).toBe('alice')

    store.invalidate('0xAAA')
    expect(store.getName('0xAAA')).toBeNull() // enqueued for refetch
    await flushMicrotasks()
    expect(store.getName('0xAAA')).toBe('alice-v2')
    expect(mockGetPrimaryNames).toHaveBeenCalledTimes(2)
  })

  it('returns null without enqueueing when registry is not configured', async () => {
    registryConfigured = false
    const store = useUsernamesStore()

    expect(store.getName('0xAAA')).toBeNull()
    await flushMicrotasks()
    expect(mockGetPrimaryNames).not.toHaveBeenCalled()
  })

  it('handles fetch errors by leaving entries unset', async () => {
    mockGetPrimaryNames.mockRejectedValueOnce(new Error('rpc failed'))
    const store = useUsernamesStore()

    store.getName('0xAAA')
    await flushMicrotasks()
    expect(store.getName('0xAAA')).toBeNull()
    // Next access should re-enqueue
    mockGetPrimaryNames.mockResolvedValueOnce(new Map([['0xaaa', 'alice']]))
    await flushMicrotasks()
    expect(store.getName('0xAAA')).toBe('alice')
  })
})
