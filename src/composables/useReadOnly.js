import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'

const FREEDOM_BROWSER_URL =
  import.meta.env.VITE_FREEDOM_BROWSER_URL || 'https://freedombrowser.eth.limo'

const TOOLTIP = 'Posting requires Freedom Browser'

export function useReadOnly() {
  const auth = useAuthStore()
  const isReadOnly = computed(() => !auth.swarmDetected)
  return {
    isReadOnly,
    freedomBrowserUrl: FREEDOM_BROWSER_URL,
    tooltip: TOOLTIP,
  }
}
