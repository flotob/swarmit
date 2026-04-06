import { defineStore } from 'pinia'
import { ref } from 'vue'
import { RECOMMENDED_VIEW_NAMES } from '../protocol/objects.js'

const PREFS_KEY = 'swarmit-views'
const AVAILABLE_KEY = 'swarmit-available-views'

export const boardScope = (slug) => `board:${slug}`
export const GLOBAL_SCOPE = 'global'

export const useViewsStore = defineStore('views', () => {
  const prefs = ref(loadJson(PREFS_KEY, {}))
  const stored = loadJson(AVAILABLE_KEY, {})
  const availableViews = ref(stored.views || {})
  const defaultViewIds = ref(stored.defaults || {})

  const KNOWN_ORDER = RECOMMENDED_VIEW_NAMES

  function loadJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null') || fallback
    } catch { return fallback }
  }

  function persistPrefs() {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs.value))
  }

  function persistAvailable() {
    localStorage.setItem(AVAILABLE_KEY, JSON.stringify({
      views: availableViews.value,
      defaults: defaultViewIds.value,
    }))
  }

  function getView(scope) {
    return prefs.value[scope] || null
  }

  function setView(scope, viewId) {
    if (viewId) {
      prefs.value[scope] = viewId
    } else {
      delete prefs.value[scope]
    }
    persistPrefs()
  }

  function setAvailableViews(scope, viewMap, defaultFeedRef) {
    if (!viewMap) {
      if (scope in availableViews.value) delete availableViews.value[scope]
      if (scope in defaultViewIds.value) delete defaultViewIds.value[scope]
      persistAvailable()
      return
    }
    const keys = Object.keys(viewMap)

    const effectiveDefault = defaultFeedRef
      ? keys.find((id) => viewMap[id] === defaultFeedRef) || null
      : null

    const sorted = [
      ...(effectiveDefault ? [effectiveDefault] : []),
      ...KNOWN_ORDER.filter((id) => keys.includes(id) && id !== effectiveDefault),
      ...keys.filter((id) => !KNOWN_ORDER.includes(id) && id !== effectiveDefault),
    ]
    let changed = false
    const current = availableViews.value[scope]
    if (!(current && current.length === sorted.length && current.every((v, i) => v === sorted[i]))) {
      availableViews.value[scope] = sorted
      changed = true
    }

    if (defaultViewIds.value[scope] !== effectiveDefault) {
      defaultViewIds.value[scope] = effectiveDefault
      changed = true
    }

    if (changed) persistAvailable()
  }

  function getAvailableViews(scope) {
    return availableViews.value[scope] || []
  }

  function getDefaultViewId(scope) {
    return defaultViewIds.value[scope] || null
  }

  return { prefs, getView, setView, setAvailableViews, getAvailableViews, getDefaultViewId }
})
