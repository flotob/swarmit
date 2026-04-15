<script setup>
import { computed } from 'vue'
import { setCuratorPref } from '../composables/useCurators'
import { useCuratorProfiles } from '../composables/useCuratorProfiles'
import { displayName } from '../lib/displayName.js'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { ChevronDown, Check, HelpCircle } from 'lucide-vue-next'

const props = defineProps({
  curatorName: String,
  curatorAddress: String,
  curators: Array,
  context: String,
})

const { profileName } = useCuratorProfiles(() => props.curators)

const allCurators = computed(() => {
  if (!props.curators) return []
  return props.curators.map((c) => ({
    address: c.curator,
    name: profileName(c.curator),
    active: !!(c.curator && props.curatorAddress && c.curator.toLowerCase() === props.curatorAddress.toLowerCase()),
  }))
})

const curatorDisplayName = computed(() =>
  displayName(props.curatorAddress, props.curatorName)
)

function selectCurator(address) {
  setCuratorPref(props.context, address)
}
</script>

<template>
  <div class="inline-block px-3 py-1.5 mb-4 rounded-md bg-secondary border border-border text-sm text-muted-foreground">
    <span>Showing view from </span>

    <DropdownMenu>
      <DropdownMenuTrigger class="inline-flex items-center gap-1 text-foreground font-medium hover:text-primary cursor-pointer outline-none transition-colors">
        {{ curatorDisplayName }}
        <ChevronDown class="w-3.5 h-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="min-w-[8rem]">
        <DropdownMenuItem
          v-for="c in allCurators"
          :key="c.address"
          @click="selectCurator(c.address)"
          class="cursor-pointer flex items-center justify-between"
        >
          <span class="truncate">{{ c.name }}</span>
          <Check v-if="c.active" class="w-4 h-4 text-primary shrink-0 ml-2" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem as-child class="cursor-pointer">
          <router-link :to="{ name: 'about' }" class="flex items-center gap-1.5 text-muted-foreground">
            <HelpCircle class="w-3.5 h-3.5" />
            What is a curator?
          </router-link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
