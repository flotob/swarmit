import { useQuery } from '@tanstack/vue-query'
import { computed, ref } from 'vue'
import { fetchObject } from '../swarm/fetch.js'
import { resolveFeed } from '../swarm/feeds.js'
import { hexToBzz } from '../protocol/references.js'
import { useCuratorDeclarations, resolveCuratorBoardIndex } from './useCurators.js'

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

      // Use shared curator resolution to get boardIndex
      const resolved = await resolveCuratorBoardIndex(slug, null, curatorList)
      if (!resolved) return null

      const { boardIndex, curator, candidates } = resolved

      // Find root entry and its threadIndexFeed
      const rootEntry = boardIndex.entries.find(
        (e) => e.submissionId === rootRef || e.submissionRef === rootRef
      )
      if (!rootEntry?.threadIndexFeed) return null

      const threadIndex = await resolveFeed(rootEntry.threadIndexFeed)
      if (!threadIndex?.nodes?.length) return null

      // Fetch all submissions + content in parallel
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

      selectedCurator.value = curator
      showCuratorBanner.value = candidates.needsPrompt || (candidates.preferred && candidates.preferred.toLowerCase() !== curator.address.toLowerCase())

      return { threadIndex, nodes, rootRef }
    },
    enabled: computed(() => !!slugRef.value && !!rootSubIdRef.value && !!curators.value?.length),
    staleTime: 30_000,
  })

  return {
    thread: threadQuery.data,
    isLoading: threadQuery.isLoading,
    isError: threadQuery.isError,
    error: threadQuery.error,
    rootSubRef,
    selectedCurator,
    showCuratorBanner,
  }
}
