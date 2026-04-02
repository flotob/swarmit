import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'swarmit-views'

export const boardScope = (slug) => `board:${slug}`
export const GLOBAL_SCOPE = 'global'

export const useViewsStore = defineStore('views', () => {
  const prefs = ref(loadFromStorage())
  const availableViews = ref({})
  const defaultViewIds = ref({})

  const KNOWN_ORDER = ['new', 'best', 'hot', 'rising', 'controversial']

  function loadFromStorage() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    } catch { return {} }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs.value))
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
    persist()
  }

  function setAvailableViews(scope, viewMap, defaultFeedRef) {
    if (!viewMap) {
      if (scope in availableViews.value) delete availableViews.value[scope]
      if (scope in defaultViewIds.value) delete defaultViewIds.value[scope]
      return
    }
    const keys = Object.keys(viewMap)
    const sorted = [
      ...KNOWN_ORDER.filter((id) => keys.includes(id)),
      ...keys.filter((id) => !KNOWN_ORDER.includes(id)),
    ]
    const current = availableViews.value[scope]
    if (!(current && current.length === sorted.length && current.every((v, i) => v === sorted[i]))) {
      availableViews.value[scope] = sorted
    }

    // Derive which named view matches the default feed
    const effectiveDefault = defaultFeedRef
      ? keys.find((id) => viewMap[id] === defaultFeedRef) || null
      : null
    if (defaultViewIds.value[scope] !== effectiveDefault) {
      defaultViewIds.value[scope] = effectiveDefault
    }
  }

  function getAvailableViews(scope) {
    return availableViews.value[scope] || []
  }

  function getDefaultViewId(scope) {
    return defaultViewIds.value[scope] || null
  }

  return { prefs, getView, setView, setAvailableViews, getAvailableViews, getDefaultViewId }
})
