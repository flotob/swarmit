// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCuratorPrefsStore } from '../../src/stores/curators.js'

const STORAGE_KEY = 'swarmit-curator-prefs'

describe('curatorPrefs store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('loads existing preferences from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tech: '0xCurator1', science: '0xCurator2' }))
    setActivePinia(createPinia())

    const store = useCuratorPrefsStore()
    expect(store.getPreference('tech')).toBe('0xCurator1')
    expect(store.getPreference('science')).toBe('0xCurator2')
  })

  it('returns null for unknown slug', () => {
    const store = useCuratorPrefsStore()
    expect(store.getPreference('nonexistent')).toBeNull()
  })

  it('setPreference updates state and persists to localStorage', async () => {
    const store = useCuratorPrefsStore()
    store.setPreference('tech', '0xNewCurator')

    expect(store.getPreference('tech')).toBe('0xNewCurator')

    // watch is flush: 'pre' by default, wait a tick for persistence
    await new Promise((r) => setTimeout(r, 0))
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(persisted.tech).toBe('0xNewCurator')
  })

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json')
    setActivePinia(createPinia())

    const store = useCuratorPrefsStore()
    expect(store.getPreference('tech')).toBeNull()
  })

  it('preserves existing prefs when adding new ones', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tech: '0xA' }))
    setActivePinia(createPinia())

    const store = useCuratorPrefsStore()
    store.setPreference('science', '0xB')

    expect(store.getPreference('tech')).toBe('0xA')
    expect(store.getPreference('science')).toBe('0xB')
  })
})
