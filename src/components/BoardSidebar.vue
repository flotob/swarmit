<script setup>
import { ChevronRight, Search } from 'lucide-vue-next'
import { Input } from './ui/input'
import { Separator } from './ui/separator'

const props = defineProps({
  slug: String,
  board: Object,
  postCount: Number,
  curatorName: String,
})

const actionClass = 'flex items-center justify-between w-full px-4 py-2 rounded-md text-sm font-medium border border-border text-foreground bg-gradient-to-b from-primary/15 to-primary/5 hover:from-primary/25 hover:to-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring transition-all'
</script>

<template>
  <div class="space-y-3">
    <div class="relative">
      <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="search"
        disabled
        title="Search coming soon"
        class="pl-8 cursor-not-allowed"
      />
    </div>

    <div class="space-y-2">
      <router-link :to="{ name: 'compose-post', params: { slug } }" :class="actionClass">
        Submit a new link
        <ChevronRight class="w-4 h-4" />
      </router-link>

      <router-link :to="{ name: 'compose-post', params: { slug } }" :class="actionClass">
        Submit a new text post
        <ChevronRight class="w-4 h-4" />
      </router-link>
    </div>

    <Separator />

    <div class="space-y-2">
      <h3 class="text-sm font-semibold text-foreground">
        About r/{{ slug }}
      </h3>
      <p v-if="board?.description" class="text-xs text-muted-foreground leading-relaxed">
        {{ board.description }}
      </p>
      <p v-else class="text-xs text-muted-foreground italic">
        No description available.
      </p>
      <div class="text-xs text-muted-foreground">
        <span v-if="postCount != null">{{ postCount }} post{{ postCount !== 1 ? 's' : '' }}</span>
        <span v-if="postCount != null && curatorName"> · </span>
        <span v-if="curatorName">curated by {{ curatorName }}</span>
      </div>
    </div>
  </div>
</template>
