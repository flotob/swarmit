<script setup>
import { computed } from 'vue'
import { setCuratorPref } from '../composables/useCurators'
import { truncateAddress } from '../lib/format.js'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

const props = defineProps({
  curatorName: String,
  curatorAddress: String,
  curators: Array,       // curator declarations: [{ curator: address, curatorProfileRef }]
  context: String,       // board slug or '_global'
})

const otherCurators = computed(() => {
  if (!props.curators || !props.curatorAddress) return []
  return props.curators.filter(
    (c) => c.curator.toLowerCase() !== props.curatorAddress.toLowerCase()
  )
})

const hasAlternatives = computed(() => otherCurators.value.length > 0)

function selectCurator(address) {
  setCuratorPref(props.context, address)
}
</script>

<template>
  <div class="px-3 py-2 mb-4 rounded-md bg-gray-800/50 border border-gray-700 text-sm text-gray-400 flex items-center justify-between">
    <span>
      Showing view from
      <span class="text-gray-200 font-medium">{{ curatorName || truncateAddress(curatorAddress) }}</span>
    </span>

    <DropdownMenu v-if="hasAlternatives">
      <DropdownMenuTrigger class="text-orange-400 hover:text-orange-300 text-xs cursor-pointer outline-none">
        Change curator
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-64">
        <DropdownMenuLabel>Switch curator</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          v-for="c in otherCurators"
          :key="c.curator"
          @click="selectCurator(c.curator)"
          class="cursor-pointer"
        >
          <span class="truncate">{{ truncateAddress(c.curator) }}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
