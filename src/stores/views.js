import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'swarmit-views'

export const useViewsStore = defineStore('views', () => {
  const prefs = ref(loadFromStorage())

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

  return { prefs, getView, setView }
})
