/**
 * Wait for queued microtasks (e.g. queueMicrotask flushes) to run.
 * Used by tests that exercise request-on-access batching stores.
 */
export function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}
