<script setup>
import { ref, onUnmounted } from 'vue'
import { useDropZone } from '@vueuse/core'
import { useSwarm } from '../composables/useSwarm'
import { useAuthStore } from '../stores/auth'
import { validateImage, buildAttachmentDescriptor, ALLOWED_TYPES } from '../lib/image-upload.js'
import { ImagePlus, X } from 'lucide-vue-next'

const props = defineProps({
  disabled: Boolean,
})

const emit = defineEmits(['uploaded', 'removed'])

const swarm = useSwarm()
const auth = useAuthStore()

const dropZoneEl = ref(null)
const fileInput = ref(null)
const uploads = ref([])
const uploading = ref(false)
const error = ref(null)

const acceptTypes = ALLOWED_TYPES.join(',')

const { isOverDropZone } = useDropZone(dropZoneEl, {
  dataTypes: ALLOWED_TYPES,
  multiple: false,
  onDrop(files) {
    if (props.disabled || uploading.value) return
    if (files?.[0]) uploadFile(files[0])
  },
})

function triggerPicker() {
  if (props.disabled || uploading.value) return
  fileInput.value?.click()
}

function onFilePicked(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (file) uploadFile(file)
}

async function uploadFile(file) {
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
          type="button"
          class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          @click="removeUpload(i)"
        >
          <X class="w-3 h-3" />
        </button>
      </div>
    </div>

    <div
      ref="dropZoneEl"
      role="button"
      tabindex="0"
      :aria-disabled="disabled || uploading"
      aria-label="Upload image"
      class="border-2 border-dashed rounded-md p-6 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
      :class="[
        disabled || uploading
          ? 'border-border opacity-50 cursor-not-allowed'
          : 'cursor-pointer hover:bg-accent/30',
        isOverDropZone ? 'border-primary bg-primary/5' : 'border-border',
      ]"
      @click="triggerPicker"
      @keydown.enter.prevent="triggerPicker"
      @keydown.space.prevent="triggerPicker"
    >
      <ImagePlus class="w-6 h-6 mx-auto mb-2 text-muted-foreground pointer-events-none" />
      <p class="text-sm text-muted-foreground pointer-events-none">
        {{ uploading ? 'Uploading…' : 'Drag an image here, or click to browse' }}
      </p>
      <input
        ref="fileInput"
        type="file"
        :accept="acceptTypes"
        class="hidden"
        :disabled="disabled || uploading"
        @change="onFilePicked"
      />
    </div>
    <p v-if="error" class="text-xs text-destructive mt-1">{{ error }}</p>
  </div>
</template>
