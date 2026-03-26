import { useColorMode as _useColorMode } from '@vueuse/core'

/**
 * Color mode composable.
 * Thin wrapper around VueUse's useColorMode with our defaults.
 * Supports 'light', 'dark', or 'auto' (follows OS preference).
 * Persisted to localStorage. Toggles .dark class on <html>.
 */
export function useColorMode() {
  const { store, state } = _useColorMode({
    storageKey: 'swarmit-color-mode',
    initialValue: 'auto',
    attribute: 'class',
    modes: { light: '', dark: 'dark', auto: '' },
  })

  // store = user preference ('light', 'dark', 'auto')
  // state = resolved mode ('light' or 'dark') — reactive to OS changes
  return { preference: store, resolved: state }
}
