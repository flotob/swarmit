<script setup>
import { useBoardList } from '../composables/useBoardList'
import { useRouter } from 'vue-router'
import { Card, CardContent } from '../components/ui/card'
import { Skeleton } from '../components/ui/skeleton'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'

const router = useRouter()
const { data: boards, isLoading, isError, error } = useBoardList()

function goToBoard(slug) {
  router.push({ name: 'board', params: { slug } })
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-foreground">Boards</h1>
      <Button as-child>
        <router-link :to="{ name: 'create-board' }">Create Board</router-link>
      </Button>
    </div>

    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="rounded-lg border border-border p-4">
        <Skeleton class="h-5 w-1/3 mb-2" />
        <Skeleton class="h-3 w-2/3" />
      </div>
    </div>

    <Alert v-else-if="isError" variant="destructive">
      <AlertDescription>{{ error?.message || 'Failed to load boards' }}</AlertDescription>
    </Alert>

    <div v-else-if="!boards?.length" class="text-center py-16">
      <p class="text-lg mb-2 text-foreground">No boards registered yet.</p>
      <p class="text-sm text-muted-foreground">Be the first — create a board to get started.</p>
    </div>

    <div v-else class="space-y-2">
      <Card
        v-for="b in boards"
        :key="b.slug"
        @click="goToBoard(b.slug)"
        class="cursor-pointer hover:bg-accent/50 transition-colors py-0 gap-0"
      >
        <CardContent class="p-4">
          <div class="text-base font-semibold text-card-foreground">
            {{ b.board?.title || `r/${b.slug}` }}
          </div>
          <div v-if="b.board?.description" class="text-sm text-muted-foreground mt-1">
            {{ b.board.description }}
          </div>
          <Badge variant="outline" class="mt-2 text-xs">r/{{ b.slug }}</Badge>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
