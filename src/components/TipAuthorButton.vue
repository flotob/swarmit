<script setup>
import { computed } from 'vue'
import { getAddress } from 'ethers'
import { HandCoins } from 'lucide-vue-next'

const props = defineProps({
  address: { type: String, required: true },
})

const href = computed(() => {
  try {
    return `ethereum:${getAddress(props.address)}@100?value=1e18`
  } catch {
    return null
  }
})
</script>

<template>
  <a
    v-if="href"
    :href="href"
    class="hover:underline flex items-center gap-1"
    title="Tip 1 xDAI"
  >
    <HandCoins class="w-3 h-3" />
    <span class="hidden md:inline">tip</span>
  </a>
</template>
