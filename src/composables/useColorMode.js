import { ref, watch, onMounted } from 'vue'

const STORAGE_KEY = 'swarmit-color-mode'

// Shared state across all component instances
const mode = ref(load()) // 'light', 'dark', or 'system'

function load() {
  try { return localStorage.getItem(STORAGE_KEY) || 'system' }
  catch { return 'system' }
}

function resolvedMode() {
  if (mode.value === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode.value
}

function apply() {
  const resolved = resolvedMode()
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

/**
 * Color mode composable.
 * Manages light/dark/system preference with localStorage persistence.
 * Call once in App.vue to initialize; use anywhere to read/write mode.
 */
export function useColorMode() {
  function setMode(newMode) {
    mode.value = newMode
    localStorage.setItem(STORAGE_KEY, newMode)
    apply()
  }

  // Listen for system preference changes when mode is 'system'
  onMounted(() => {
    apply()
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => { if (mode.value === 'system') apply() }
    mql.addEventListener('change', onChange)
  })

  return { mode, setMode, resolvedMode }
}
