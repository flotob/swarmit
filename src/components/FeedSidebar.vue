<script setup>
import { ChevronRight, Search } from 'lucide-vue-next'
import { Input } from './ui/input'
</script>

<template>
  <div class="space-y-2">
    <div class="relative">
      <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="search"
        disabled
        class="pl-8 cursor-not-allowed"
      />
    </div>

    <router-link
      :to="{ name: 'boards' }"
      class="flex items-center justify-between w-full px-4 py-2 rounded-md text-sm font-medium text-primary-foreground bg-gradient-to-r from-primary/80 to-primary hover:from-primary hover:to-primary/90 transition-all"
    >
      Submit a new link
      <ChevronRight class="w-4 h-4" />
    </router-link>

    <router-link
      :to="{ name: 'boards' }"
      class="flex items-center justify-between w-full px-4 py-2 rounded-md text-sm font-medium text-primary-foreground bg-gradient-to-r from-primary/80 to-primary hover:from-primary hover:to-primary/90 transition-all"
    >
      Submit a new text post
      <ChevronRight class="w-4 h-4" />
    </router-link>

    <router-link
      :to="{ name: 'create-board' }"
      class="flex items-center justify-between w-full px-4 py-2 rounded-md text-sm font-medium text-primary-foreground bg-gradient-to-r from-primary/80 to-primary hover:from-primary hover:to-primary/90 transition-all"
    >
      Create your own hive
      <ChevronRight class="w-4 h-4" />
    </router-link>

    <div class="flex items-center justify-center gap-2 pt-2">
      <span class="text-xl">🐝</span>
      <p class="text-xs text-muted-foreground italic leading-tight">
        ...for your community.<br />
        ...for your fave niche.
      </p>
    </div>
  </div>
</template>
