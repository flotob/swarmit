// Reserved for a future "browse all boards" surface (chain-wide enumeration).
import { useQuery } from '@tanstack/vue-query'
import { getBoardRegistrations, getLatestBoardMetadata } from '../chain/events.js'
import { fetchObject } from '../swarm/fetch.js'
import { validate } from '../protocol/objects.js'

export function useBoardList() {
  return useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const registrations = await getBoardRegistrations()

      // Deduplicate by slug (keep latest)
      const bySlug = new Map()
      for (const reg of registrations) bySlug.set(reg.slug, reg)
      const uniqueRegs = [...bySlug.values()]

      // Fetch latest metadata in parallel, validate at trust boundary
      const boards = await Promise.all(
        uniqueRegs.map(async (reg) => {
          try {
            const meta = await getLatestBoardMetadata(reg.slug)
            if (!meta?.boardRef) return { slug: reg.slug, governance: reg.governance, board: null }
            const board = await fetchObject(meta.boardRef)
            const { valid } = validate(board)
            return { slug: reg.slug, governance: reg.governance, board: valid ? board : null }
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
