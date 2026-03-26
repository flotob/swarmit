import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'swarmit-sidebar'

export const useUiStore = defineStore('ui', () => {
  const sidebarOpen = ref(load())

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'false') }
    catch { return false }
  }

  watch(sidebarOpen, (v) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
  }, { flush: 'post' })

  function toggleSidebar() { sidebarOpen.value = !sidebarOpen.value }
  function openSidebar() { sidebarOpen.value = true }
  function closeSidebar() { sidebarOpen.value = false }

  return { sidebarOpen, toggleSidebar, openSidebar, closeSidebar }
})
