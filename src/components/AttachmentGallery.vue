<script setup>
import { computed } from 'vue'
import { bzzToGatewayUrl } from '../protocol/references.js'

const props = defineProps({
  attachments: { type: Array, default: () => [] },
  bodyText: { type: String, default: '' },
})

const unembedded = computed(() =>
  props.attachments.filter((a) =>
    a.kind === 'image' && a.reference && !props.bodyText.includes(a.reference)
  )
)
</script>

<template>
  <div v-if="unembedded.length" class="flex flex-wrap gap-2 mt-3">
    <a
      v-for="att in unembedded"
      :key="att.reference"
      :href="bzzToGatewayUrl(att.reference)"
      target="_blank"
      class="block"
    >
      <img
        :src="bzzToGatewayUrl(att.reference)"
        :alt="att.altText || att.name || 'Attachment'"
        class="max-w-full md:max-w-xs max-h-64 h-auto rounded-md border border-border"
      />
    </a>
  </div>
</template>
