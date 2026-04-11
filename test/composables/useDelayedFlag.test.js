// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { effectScope, ref } from 'vue'
import { useDelayedFlag } from '../../src/composables/useDelayedFlag.js'

describe('useDelayedFlag', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts false when source is false', () => {
    const scope = effectScope()
    const source = ref(false)
    let flag
    scope.run(() => { flag = useDelayedFlag(source, 150) })
    expect(flag.value).toBe(false)
    scope.stop()
  })

  it('stays false for the delay window after source becomes true', () => {
    const scope = effectScope()
    const source = ref(false)
    let flag
    scope.run(() => { flag = useDelayedFlag(source, 150) })

    source.value = true
    expect(flag.value).toBe(false)
    vi.advanceTimersByTime(100)
    expect(flag.value).toBe(false)
    vi.advanceTimersByTime(50)
    expect(flag.value).toBe(true)
    scope.stop()
  })

  it('does NOT flip true if source returns to false within the delay', () => {
    const scope = effectScope()
    const source = ref(false)
    let flag
    scope.run(() => { flag = useDelayedFlag(source, 150) })

    source.value = true
    vi.advanceTimersByTime(50)
    source.value = false
    vi.advanceTimersByTime(200)
    expect(flag.value).toBe(false)
    scope.stop()
  })

  it('true→false transition is immediate', () => {
    const scope = effectScope()
    const source = ref(true)
    let flag
    scope.run(() => { flag = useDelayedFlag(source, 150) })

    vi.advanceTimersByTime(150)
    expect(flag.value).toBe(true)

    source.value = false
    expect(flag.value).toBe(false)
    scope.stop()
  })

  it('accepts a getter function as source', () => {
    const scope = effectScope()
    const source = ref(false)
    let flag
    scope.run(() => { flag = useDelayedFlag(() => source.value, 150) })

    source.value = true
    vi.advanceTimersByTime(150)
    expect(flag.value).toBe(true)
    scope.stop()
  })

  it('cleans up pending timer on scope dispose', () => {
    const scope = effectScope()
    const source = ref(false)
    let flag
    scope.run(() => { flag = useDelayedFlag(source, 150) })

    source.value = true
    scope.stop()
    vi.advanceTimersByTime(200)
    // Flag should not have been set after dispose; no error thrown
    expect(flag.value).toBe(false)
  })

  it('handles rapid flips correctly (true→false→true)', () => {
    const scope = effectScope()
    const source = ref(false)
    let flag
    scope.run(() => { flag = useDelayedFlag(source, 150) })

    source.value = true
    vi.advanceTimersByTime(50)
    source.value = false
    source.value = true
    vi.advanceTimersByTime(100)
    expect(flag.value).toBe(false) // only 100ms since last true
    vi.advanceTimersByTime(50)
    expect(flag.value).toBe(true)
    scope.stop()
  })
})
