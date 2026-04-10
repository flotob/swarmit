import { computed, ref, toValue } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useVotesStore } from '../stores/votes'
import { getUserVote } from '../chain/events.js'
import { setVote as sendVote } from '../chain/transactions.js'
import { isContractConfigured } from '../chain/contract.js'
import { useWallet } from './useWallet.js'
import { waitForReceipt } from '../lib/rpc.js'

/**
 * Vote composable for a single submission. Reads go through the votes
 * store (batched via Multicall3 on first render); writes go through
 * chain/transactions and invalidate the store entry on success.
 * @param {string|Ref<string>|ComputedRef<string>} submissionRef - bzz:// ref or hex string
 */
export function useVotes(submissionRef) {
  const auth = useAuthStore()
  const wallet = useWallet()
  const store = useVotesStore()

  const subRef = computed(() => toValue(submissionRef))

  const isVoting = ref(false)
  const error = ref(null)
  // Per-component transient overrides while a tx is in flight.
  const optimisticTotals = ref(null)
  const optimisticMyVote = ref(null)

  const storeTotals = computed(() =>
    subRef.value ? store.getTotals(subRef.value) : null,
  )
  const storeMyVote = computed(() =>
    subRef.value ? store.getMyVote(subRef.value) : null,
  )

  const upvotes = computed(() => optimisticTotals.value?.upvotes ?? storeTotals.value?.upvotes ?? 0)
  const downvotes = computed(() => optimisticTotals.value?.downvotes ?? storeTotals.value?.downvotes ?? 0)
  const score = computed(() => upvotes.value - downvotes.value)
  const myVote = computed(() => optimisticMyVote.value ?? storeMyVote.value ?? 0)

  async function vote(intendedDirection) {
    if (isVoting.value || !isContractConfigured()) return
    error.value = null
    isVoting.value = true

    let justConnected = false
    try {
      if (!auth.walletConnected) {
        await wallet.connect()
        justConnected = true
      }
    } catch (err) {
      if (err.code !== 4001) error.value = err.message
      isVoting.value = false
      return
    }

    // After a fresh wallet connect, the store hasn't fetched myVote yet.
    // Fall through to the un-batched direct read so we can compute the
    // correct toggle direction on this first click.
    let currentVote = storeMyVote.value ?? 0
    if (justConnected) {
      try {
        currentVote = await getUserVote(subRef.value, auth.userAddress)
      } catch { /* proceed with 0 */ }
    }

    const direction = intendedDirection === currentVote ? 0 : intendedDirection

    const prevUp = upvotes.value
    const prevDown = downvotes.value
    optimisticMyVote.value = direction
    let newUp = prevUp
    let newDown = prevDown
    if (currentVote === 1) newUp--
    if (currentVote === -1) newDown--
    if (direction === 1) newUp++
    if (direction === -1) newDown++
    optimisticTotals.value = { upvotes: newUp, downvotes: newDown }

    try {
      const txHash = await sendVote({ submissionRef: subRef.value, direction })
      const receipt = await waitForReceipt(txHash)
      if (receipt.status === '0x0') {
        throw new Error('Vote transaction reverted on-chain')
      }
      store.invalidate(subRef.value)
      optimisticTotals.value = null
      optimisticMyVote.value = null
    } catch (err) {
      optimisticTotals.value = null
      optimisticMyVote.value = null
      if (err.code !== 4001) error.value = err.message
    } finally {
      isVoting.value = false
    }
  }

  function upvote() {
    return vote(1)
  }

  function downvote() {
    return vote(-1)
  }

  return { upvotes, downvotes, score, myVote, isVoting, error, upvote, downvote }
}
