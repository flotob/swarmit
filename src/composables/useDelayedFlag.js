import { ref, watch, onScopeDispose } from 'vue'

/**
 * Mirror a reactive boolean source, but delay the false→true transition
 * by `delayMs`. The true→false transition is immediate.
 *
 * Use case: avoid flashing a loading indicator on fast operations.
 * If the source flips true then false within the delay window, the
 * returned flag never turns true at all — the indicator stays hidden.
 *
 * Note: not a drop-in for VueUse `refDebounced` — that debounces both
 * edges, which would keep the indicator visible AFTER data arrives.
 *
 * @param {(() => boolean) | import('vue').Ref<boolean>} source
 * @param {number} [delayMs=150]
 * @returns {import('vue').Ref<boolean>}
 */
export function useDelayedFlag(source, delayMs = 150) {
  const flag = ref(false)
  let timer = null

  // flush: 'sync' so the timer starts exactly when the source changes,
  // not on the next microtask. Keeps the delay deterministic and makes
  // fake-timer tests straightforward.
  watch(
    source,
    (val) => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      if (val) {
        timer = setTimeout(() => {
          flag.value = true
          timer = null
        }, delayMs)
      } else {
        flag.value = false
      }
    },
    { immediate: true, flush: 'sync' },
  )

  onScopeDispose(() => {
    if (timer) clearTimeout(timer)
  })

  return flag
}
