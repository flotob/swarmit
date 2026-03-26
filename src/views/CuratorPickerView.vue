<script setup>
import { useCuratorDeclarations, getCuratorPref, setCuratorPref } from '../composables/useCurators'
import { useCuratorProfiles } from '../composables/useCuratorProfiles'
import { truncateAddress } from '../lib/format.js'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Check } from 'lucide-vue-next'

const { data: curators, isLoading, isError, error } = useCuratorDeclarations()
const { profiles } = useCuratorProfiles(curators)

function getProfile(addr) {
  return profiles.get(addr) || null
}

function isSelected(addr, boardSlug) {
  return getCuratorPref(boardSlug)?.toLowerCase() === addr.toLowerCase()
}

function selectCurator(addr, boardSlug) {
  setCuratorPref(boardSlug, addr)
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-foreground mb-2">Curators</h1>
    <p class="text-muted-foreground mb-6">Choose a curator to change how boards are moderated and ordered.</p>

    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="rounded-lg border border-border p-4">
        <Skeleton class="h-5 w-1/3 mb-2" />
        <Skeleton class="h-3 w-2/3 mb-2" />
        <Skeleton class="h-3 w-1/2" />
      </div>
    </div>

    <Alert v-else-if="isError" variant="destructive">
      <AlertDescription>{{ error?.message || 'Failed to load curators' }}</AlertDescription>
    </Alert>

    <div v-else-if="!curators?.length" class="text-center py-16">
      <p class="text-muted-foreground">No curators have declared themselves yet.</p>
    </div>

    <div v-else class="space-y-3">
      <Card
        v-for="c in curators"
        :key="c.curator"
        class="py-0 gap-0"
      >
        <CardContent class="p-4">
          <div class="text-base font-semibold text-card-foreground">
            {{ getProfile(c.curator)?.name || truncateAddress(c.curator) }}
          </div>
          <div class="text-xs font-mono text-muted-foreground mt-0.5">
            {{ c.curator }}
          </div>
          <p v-if="getProfile(c.curator)?.description" class="text-sm text-muted-foreground mt-2">
            {{ getProfile(c.curator).description }}
          </p>

          <div v-if="getProfile(c.curator)?.boardFeeds" class="mt-3 flex flex-wrap gap-2">
            <button
              v-for="(feedUrl, boardSlug) in getProfile(c.curator).boardFeeds"
              :key="boardSlug"
              @click="selectCurator(c.curator, boardSlug)"
              :disabled="isSelected(c.curator, boardSlug)"
              class="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border transition-colors"
              :class="isSelected(c.curator, boardSlug)
                ? 'bg-success/10 text-success border-success/30 cursor-default'
                : 'bg-secondary text-secondary-foreground border-border hover:border-primary hover:text-primary'"
            >
              <Check v-if="isSelected(c.curator, boardSlug)" class="w-3 h-3" />
              {{ isSelected(c.curator, boardSlug) ? `r/${boardSlug}` : `Use for r/${boardSlug}` }}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
