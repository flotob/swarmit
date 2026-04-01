import { computed, ref, toValue } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '../stores/auth'
import { getVoteTotals, getUserVote } from '../chain/events.js'
import { setVote as sendVote } from '../chain/transactions.js'
import { isContractConfigured } from '../chain/contract.js'

/**
 * Vote composable for a single submission.
 * @param {string|Ref<string>|ComputedRef<string>} submissionRef - bzz:// ref or hex string
 */
export function useVotes(submissionRef) {
  const auth = useAuthStore()
  const queryClient = useQueryClient()

  const subRef = computed(() => toValue(submissionRef))
  const enabled = computed(() => !!(subRef.value && isContractConfigured()))

  const { data: totals } = useQuery({
    queryKey: computed(() => ['voteTotals', subRef.value]),
    queryFn: () => getVoteTotals(subRef.value),
    enabled,
    staleTime: 30_000,
    placeholderData: { upvotes: 0, downvotes: 0 },
  })

  const { data: myVoteData } = useQuery({
    queryKey: computed(() => ['userVote', subRef.value, auth.userAddress]),
    queryFn: () => getUserVote(subRef.value, auth.userAddress),
    enabled: computed(() => enabled.value && !!auth.walletConnected),
    staleTime: 30_000,
    placeholderData: 0,
  })

  const isVoting = ref(false)
  const error = ref(null)

  // Optimistic overrides — null means "use server data"
  const optimisticTotals = ref(null)
  const optimisticMyVote = ref(null)

  const upvotes = computed(() => optimisticTotals.value?.upvotes ?? totals.value?.upvotes ?? 0)
  const downvotes = computed(() => optimisticTotals.value?.downvotes ?? totals.value?.downvotes ?? 0)
  const score = computed(() => upvotes.value - downvotes.value)
  const myVote = computed(() => optimisticMyVote.value ?? myVoteData.value ?? 0)

  async function vote(direction) {
    if (isVoting.value) return
    error.value = null
    isVoting.value = true

    const prevMyVote = myVote.value
    const prevUp = upvotes.value
    const prevDown = downvotes.value

    optimisticMyVote.value = direction
    let newUp = prevUp
    let newDown = prevDown
    if (prevMyVote === 1) newUp--
    if (prevMyVote === -1) newDown--
    if (direction === 1) newUp++
    if (direction === -1) newDown++
    optimisticTotals.value = { upvotes: newUp, downvotes: newDown }

    try {
      await sendVote({ submissionRef: subRef.value, direction })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['voteTotals', subRef.value] }),
        queryClient.invalidateQueries({ queryKey: ['userVote', subRef.value, auth.userAddress] }),
      ])
      optimisticTotals.value = null
      optimisticMyVote.value = null
    } catch (err) {
      optimisticTotals.value = null
      optimisticMyVote.value = null
      error.value = err.message
    } finally {
      isVoting.value = false
    }
  }

  function upvote() {
    return vote(myVote.value === 1 ? 0 : 1)
  }

  function downvote() {
    return vote(myVote.value === -1 ? 0 : -1)
  }

  return { upvotes, downvotes, score, myVote, isVoting, error, upvote, downvote }
}
