import { useQuery } from '@tanstack/vue-query'
import { computed, ref } from 'vue'
import { fetchObject } from '../swarm/fetch.js'
import { fetchBoardIndex, resolveFeed } from '../swarm/feeds.js'
import { hexToBzz } from '../protocol/references.js'
import { useCuratorDeclarations, buildCandidates } from './useCurators.js'

export function useThread(slugRef, rootSubIdRef) {
  const { data: curators } = useCuratorDeclarations()

  const selectedCurator = ref(null)
  const showCuratorBanner = ref(false)

  const rootSubRef = computed(() => {
    const id = rootSubIdRef.value
    return id ? hexToBzz(id) : null
  })

  const threadQuery = useQuery({
    queryKey: ['thread', slugRef, rootSubIdRef],
    queryFn: async () => {
      const slug = slugRef.value
      const rootRef = rootSubRef.value
      const curatorList = curators.value || []

      if (!rootRef || !curatorList.length) return null

      const candidates = buildCandidates(slug, null, curatorList)

      for (const addr of candidates.list) {
        const match = curatorList.find((c) => c.curator.toLowerCase() === addr.toLowerCase())
        if (!match) continue

        try {
          const profile = await fetchObject(match.curatorProfileRef)
          if (!profile) continue

          const boardIndex = await fetchBoardIndex(profile, slug)
          if (!boardIndex?.entries) continue

          const rootEntry = boardIndex.entries.find(
            (e) => e.submissionId === rootRef || e.submissionRef === rootRef
          )
          if (!rootEntry?.threadIndexFeed) continue

          const threadIndex = await resolveFeed(rootEntry.threadIndexFeed)
          if (!threadIndex?.nodes?.length) continue

          const nodes = await Promise.all(
            threadIndex.nodes.map(async (node) => {
              try {
                const submission = await fetchObject(node.submissionId)
                const content = await fetchObject(submission.contentRef)
                return { ...node, submission, content }
              } catch {
                return { ...node, submission: null, content: null }
              }
            })
          )

          selectedCurator.value = { address: addr, profile }
          showCuratorBanner.value = candidates.needsPrompt || (candidates.preferred && candidates.preferred.toLowerCase() !== addr.toLowerCase())

          return { threadIndex, nodes, rootRef }
        } catch {
          continue
        }
      }

      return null
    },
    enabled: computed(() => !!slugRef.value && !!rootSubIdRef.value && !!curators.value?.length),
    staleTime: 30_000,
  })

  return {
    thread: threadQuery.data,
    isLoading: threadQuery.isLoading,
    isError: threadQuery.isError,
    error: threadQuery.error,
    selectedCurator,
    showCuratorBanner,
  }
}
