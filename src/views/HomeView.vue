<script setup>
import { useCuratorBoards } from '../composables/useCuratorBoards'
import { useRouter } from 'vue-router'
import { Card, CardContent } from '../components/ui/card'
import { Skeleton } from '../components/ui/skeleton'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Button } from '../components/ui/button'

const router = useRouter()
const { boards, curatorName, isLoading, isError, error } = useCuratorBoards()

function goToBoard(slug) {
  router.push({ name: 'board', params: { slug } })
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-foreground">Boards</h1>
        <p v-if="curatorName" class="text-sm text-muted-foreground mt-1">Curated by {{ curatorName }}</p>
      </div>
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

    <div v-else-if="!boards.length" class="text-center py-16">
      <p class="text-lg mb-2 text-foreground">No boards available yet.</p>
      <p class="text-sm text-muted-foreground">The selected curator hasn't published any board feeds.</p>
    </div>

    <div v-else class="space-y-2">
      <Card
        v-for="slug in boards"
        :key="slug"
        @click="goToBoard(slug)"
        class="cursor-pointer hover:bg-accent/50 transition-colors py-0 gap-0"
      >
        <CardContent class="p-4">
          <div class="text-base font-semibold text-card-foreground">r/{{ slug }}</div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
