<script setup>
import { ref, onUnmounted } from 'vue'
import { useSwarm } from '../composables/useSwarm'
import { useAuthStore } from '../stores/auth'
import { validateImage, buildAttachmentDescriptor, ALLOWED_TYPES } from '../lib/image-upload.js'
import { Button } from './ui/button'
import { ImagePlus, X } from 'lucide-vue-next'

const emit = defineEmits(['uploaded', 'removed'])

defineProps({
  disabled: Boolean,
})

const swarm = useSwarm()
const auth = useAuthStore()
const uploads = ref([])
const uploading = ref(false)
const error = ref(null)

const acceptTypes = ALLOWED_TYPES.join(',')

async function handleFileSelect(event) {
  const file = event.target.files?.[0]
  if (!file) return

  event.target.value = ''

  error.value = null
  const validationError = validateImage(file)
  if (validationError) {
    error.value = validationError
    return
  }

  uploading.value = true
  try {
    if (!auth.swarmConnected) await swarm.connect()

    const arrayBuffer = await file.arrayBuffer()
    const data = new Uint8Array(arrayBuffer)
    const result = await swarm.publishData(data, file.type, file.name)

    const descriptor = buildAttachmentDescriptor({ bzzUrl: result.bzzUrl, file })
    const previewUrl = URL.createObjectURL(file)

    uploads.value.push({ descriptor, previewUrl })
    emit('uploaded', descriptor)
  } catch (err) {
    error.value = `Upload failed: ${err.message}`
  } finally {
    uploading.value = false
  }
}

function removeUpload(index) {
  const removed = uploads.value[index]
  if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl)
  uploads.value.splice(index, 1)
  emit('removed', removed.descriptor)
}

onUnmounted(() => {
  uploads.value.forEach((u) => {
    if (u.previewUrl) URL.revokeObjectURL(u.previewUrl)
  })
})
</script>

<template>
  <div>
    <div v-if="uploads.length" class="flex flex-wrap gap-2 mb-2">
      <div
        v-for="(upload, i) in uploads"
        :key="upload.descriptor.reference"
        class="relative group"
      >
        <img
          :src="upload.previewUrl"
          :alt="upload.descriptor.name || 'Uploaded image'"
          class="h-20 w-20 object-cover rounded-md border border-border"
        />
        <button
          @click="removeUpload(i)"
          class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          type="button"
        >
          <X class="w-3 h-3" />
        </button>
      </div>
    </div>

    <Button
      variant="outline"
      size="sm"
      :disabled="disabled || uploading"
      as-child
    >
      <label class="cursor-pointer">
        <input
          type="file"
          :accept="acceptTypes"
          class="hidden"
          :disabled="disabled || uploading"
          @change="handleFileSelect"
        />
        <ImagePlus class="w-4 h-4 mr-1.5" />
        {{ uploading ? 'Uploading...' : 'Attach image' }}
      </label>
    </Button>

    <p v-if="error" class="text-xs text-destructive mt-1">{{ error }}</p>
  </div>
</template>
