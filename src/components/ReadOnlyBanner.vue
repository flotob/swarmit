<script setup>
import { useReadOnly } from '../composables/useReadOnly'
import { ExternalLink, Info } from 'lucide-vue-next'

const { isReadOnly, freedomBrowserUrl } = useReadOnly()
</script>

<template>
  <div
    v-if="isReadOnly"
    class="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 mb-4 text-sm flex items-start gap-3"
  >
    <Info class="w-4 h-4 mt-0.5 shrink-0 text-warning" />
    <div class="flex-1 min-w-0">
      <p class="font-medium text-foreground">Posting requires Freedom Browser</p>
      <p class="text-muted-foreground mt-1">
        You're browsing Swarmit through a public gateway. Voting and tipping work here, but posting and replying need a local Swarm node.
      </p>
      <a
        :href="freedomBrowserUrl"
        target="_blank"
        rel="noopener"
        class="inline-flex items-center gap-1 mt-2 text-link hover:underline font-medium"
      >
        Get Freedom Browser
        <ExternalLink class="w-3.5 h-3.5" />
      </a>
    </div>
  </div>
</template>
