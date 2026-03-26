<script setup>
import { computed } from 'vue'

const props = defineProps({
  attachments: { type: Array, default: () => [] },
  bodyText: { type: String, default: '' },
})

// Only show attachments that aren't already embedded in the markdown body
const unembedded = computed(() =>
  props.attachments.filter((a) =>
    a.kind === 'image' && a.reference && !props.bodyText.includes(a.reference)
  )
)

function src(ref) {
  return ref.startsWith('bzz://') ? `/bzz/${ref.slice(6)}/` : ref
}
</script>

<template>
  <div v-if="unembedded.length" class="flex flex-wrap gap-2 mt-3">
    <a
      v-for="att in unembedded"
      :key="att.reference"
      :href="src(att.reference)"
      target="_blank"
      class="block"
    >
      <img
        :src="src(att.reference)"
        :alt="att.altText || att.name || 'Attachment'"
        class="max-w-xs max-h-64 rounded-md border border-gray-700"
      />
    </a>
  </div>
</template>
