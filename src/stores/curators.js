import { defineStore } from 'pinia'
import { reactive, watch } from 'vue'

const STORAGE_KEY = 'swarmit-curator-prefs'

export const useCuratorPrefsStore = defineStore('curatorPrefs', () => {
  const preferences = reactive(load())

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} }
    catch { return {} }
  }

  watch(preferences, () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  }, { deep: true })

  function getPreference(slug) {
    return preferences[slug] || null
  }

  function setPreference(slug, curatorAddress) {
    preferences[slug] = curatorAddress
  }

  return { preferences, getPreference, setPreference }
})
