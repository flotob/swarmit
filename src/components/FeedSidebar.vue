<script setup>
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Separator } from './ui/separator'
</script>

<template>
  <Card class="py-0 gap-0">
    <CardContent class="p-0">
      <Button as-child class="w-full rounded-none rounded-t-xl justify-center">
        <router-link :to="{ name: 'boards' }">Submit a new post</router-link>
      </Button>
      <Button as-child variant="outline" class="w-full rounded-none border-x-0 justify-center">
        <router-link :to="{ name: 'create-board' }">Create your own swarm</router-link>
      </Button>
    </CardContent>
    <Separator />
    <CardContent class="p-4 text-center">
      <div class="text-3xl mb-2">🐝</div>
      <p class="text-sm text-muted-foreground italic">
        ...for your community.<br />
        ...for your fave niche.
      </p>
    </CardContent>
  </Card>
</template>
