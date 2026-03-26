import { watch } from 'vue'
import { useSubmissionsStore } from '../stores/submissions'
import { useUiStore } from '../stores/ui'

export function useAutoShowSidebar() {
  const submissions = useSubmissionsStore()
  const ui = useUiStore()

  watch(
    () => submissions.items.length,
    (newLen, oldLen) => {
      if (newLen > oldLen) ui.openSidebar()
    },
  )
}
