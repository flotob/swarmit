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
  <div class="px-3 py-2 mb-4 rounded-md bg-gray-800/50 border border-gray-700 text-sm text-gray-400">
    <span>Showing view from </span>

    <DropdownMenu v-if="allCurators.length > 1">
      <DropdownMenuTrigger class="inline-flex items-center gap-1 text-gray-200 font-medium hover:text-orange-400 cursor-pointer outline-none transition-colors">
        {{ displayName }}
        <svg class="w-3.5 h-3.5 opacity-60" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" /></svg>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-72">
        <DropdownMenuItem
          v-for="c in allCurators"
          :key="c.address"
          @click="selectCurator(c.address)"
          class="cursor-pointer flex items-center justify-between"
        >
          <span class="truncate">{{ c.name }}</span>
          <span v-if="c.active" class="text-green-500 text-xs shrink-0 ml-2">&#10003;</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <span v-else class="text-gray-200 font-medium">{{ displayName }}</span>
  </div>
</template>
