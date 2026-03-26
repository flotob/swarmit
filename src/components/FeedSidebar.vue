<script setup>
import { Button } from './ui/button'
import { ChevronRight } from 'lucide-vue-next'
</script>

<template>
  <div class="space-y-2">
    <Button as-child variant="outline" class="w-full justify-between">
      <router-link :to="{ name: 'boards' }">
        Submit a new link
        <ChevronRight class="w-4 h-4" />
      </router-link>
    </Button>

    <Button as-child variant="outline" class="w-full justify-between">
      <router-link :to="{ name: 'boards' }">
        Submit a new text post
        <ChevronRight class="w-4 h-4" />
      </router-link>
    </Button>

    <Button as-child variant="outline" class="w-full justify-between">
      <router-link :to="{ name: 'create-board' }">
        Create your own hive
        <ChevronRight class="w-4 h-4" />
      </router-link>
    </Button>

    <div class="flex items-center gap-2 pt-2 px-1">
      <span class="text-xl">🐝</span>
      <p class="text-xs text-muted-foreground italic leading-tight">
        ...for your community.<br />
        ...for your fave niche.
      </p>
    </div>
  </div>
</template>
