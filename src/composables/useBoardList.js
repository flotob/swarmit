import { useQuery } from '@tanstack/vue-query'
import { getBoardRegistrations, getLatestBoardMetadata } from '../chain/events.js'
import { fetchObject } from '../swarm/fetch.js'

export function useBoardList() {
  return useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const registrations = await getBoardRegistrations()

      // Deduplicate by slug (keep latest)
      const bySlug = new Map()
      for (const reg of registrations) bySlug.set(reg.slug, reg)
      const uniqueRegs = [...bySlug.values()]

      // Fetch latest metadata in parallel
      const boards = await Promise.all(
        uniqueRegs.map(async (reg) => {
          try {
            const meta = await getLatestBoardMetadata(reg.slug)
            const board = meta?.boardRef ? await fetchObject(meta.boardRef) : null
            return { slug: reg.slug, governance: reg.governance, board }
          } catch {
            return { slug: reg.slug, governance: reg.governance, board: null }
          }
        })
      )

      return boards
    },
    staleTime: 60_000,
  })
}
