<script setup>
import { computed, reactive, watch } from 'vue'
import { setCuratorPref } from '../composables/useCurators'
import { fetchObject } from '../swarm/fetch.js'
import { validate } from '../protocol/objects.js'
import { truncateAddress } from '../lib/format.js'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { ChevronDown, Check } from 'lucide-vue-next'

const props = defineProps({
  curatorName: String,
  curatorAddress: String,
  curators: Array,
  context: String,
})

const profiles = reactive(new Map())

watch(() => props.curators, async (list) => {
  if (!list) return
  await Promise.allSettled(
    list
      .filter((c) => c.curator && !profiles.has(c.curator))
      .map(async (c) => {
        try {
          const profile = await fetchObject(c.curatorProfileRef)
          const { valid } = validate(profile)
          profiles.set(c.curator, valid ? profile : null)
        } catch {
          profiles.set(c.curator, null)
        }
      })
  )
}, { immediate: true })

function profileName(addr) {
  return profiles.get(addr)?.name || truncateAddress(addr)
}

const allCurators = computed(() => {
  if (!props.curators) return []
  return props.curators.map((c) => ({
    address: c.curator,
    name: profileName(c.curator),
    active: !!(c.curator && props.curatorAddress && c.curator.toLowerCase() === props.curatorAddress.toLowerCase()),
  }))
})

const displayName = computed(() =>
  props.curatorName || truncateAddress(props.curatorAddress)
)

function selectCurator(address) {
  setCuratorPref(props.context, address)
}
</script>

<template>
  <div class="px-3 py-2 mb-4 rounded-md bg-secondary border border-border text-sm text-muted-foreground">
    <span>Showing view from </span>

    <DropdownMenu v-if="allCurators.length > 1">
      <DropdownMenuTrigger class="inline-flex items-center gap-1 text-foreground font-medium hover:text-primary cursor-pointer outline-none transition-colors">
        {{ displayName }}
        <ChevronDown class="w-3.5 h-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-72">
        <DropdownMenuItem
          v-for="c in allCurators"
          :key="c.address"
          @click="selectCurator(c.address)"
          class="cursor-pointer flex items-center justify-between"
        >
          <span class="truncate">{{ c.name }}</span>
          <Check v-if="c.active" class="w-4 h-4 text-primary shrink-0 ml-2" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <span v-else class="text-foreground font-medium">{{ displayName }}</span>
  </div>
</template>
