<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePublish } from '../composables/usePublish'
import StatusBar from '../components/StatusBar.vue'
import ImageUpload from '../components/ImageUpload.vue'

const route = useRoute()
const router = useRouter()
const slug = computed(() => route.params.slug)

const title = ref('')
const body = ref('')
const attachments = ref([])
const bodyEl = ref(null)

const { publishPost, steps, isPublishing, result, error } = usePublish()

function onImageUploaded(descriptor) {
  attachments.value.push(descriptor)

  // Insert markdown image syntax at cursor position
  const textarea = bodyEl.value
  if (textarea) {
    const name = descriptor.name || 'image'
    const syntax = `![${name}](${descriptor.reference})`
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = body.value
    body.value = text.slice(0, start) + syntax + text.slice(end)

    // Move cursor after inserted text
    const newPos = start + syntax.length
    requestAnimationFrame(() => {
      textarea.selectionStart = newPos
      textarea.selectionEnd = newPos
      textarea.focus()
    })
  }
}

function onImageRemoved(descriptor) {
  attachments.value = attachments.value.filter((a) => a.reference !== descriptor.reference)

  // Remove the markdown image syntax from body if present
  const syntax = `![${descriptor.name || 'image'}](${descriptor.reference})`
  if (body.value.includes(syntax)) {
    body.value = body.value.replace(syntax, '').trim()
  }
}

async function handleSubmit() {
  if (!title.value.trim() || !body.value.trim()) return

  try {
    await publishPost({
      boardSlug: slug.value,
      title: title.value.trim(),
      bodyText: body.value.trim(),
      attachments: attachments.value.length > 0 ? attachments.value : undefined,
    })
  } catch {
    // Error is already captured in the error ref
  }
}
</script>

<template>
  <div>
    <router-link
      :to="{ name: 'board', params: { slug } }"
      class="text-sm text-gray-500 hover:text-gray-300 mb-4 inline-block"
    >
      &larr; r/{{ slug }}
    </router-link>

    <h2 class="text-2xl font-bold mb-6">Submit to r/{{ slug }}</h2>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label class="block text-sm text-gray-400 mb-1">Title</label>
        <input
          v-model="title"
          type="text"
          placeholder="Post title"
          required
          :disabled="isPublishing"
          class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500 disabled:opacity-50"
        />
      </div>

      <div>
        <label class="block text-sm text-gray-400 mb-1">Body (markdown)</label>
        <textarea
          ref="bodyEl"
          v-model="body"
          placeholder="Write your post..."
          required
          rows="8"
          :disabled="isPublishing"
          class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-gray-200 placeholder-gray-600 font-mono text-sm resize-y focus:outline-none focus:border-orange-500 disabled:opacity-50"
        />
      </div>

      <ImageUpload
        :disabled="isPublishing"
        @uploaded="onImageUploaded"
        @removed="onImageRemoved"
      />

      <button
        type="submit"
        :disabled="isPublishing || !title.trim() || !body.trim()"
        class="px-4 py-2 text-sm font-medium rounded-md bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ isPublishing ? 'Publishing...' : result ? 'Published' : 'Publish Post' }}
      </button>
    </form>

    <!-- Progress -->
    <div v-if="steps.length" class="mt-6">
      <StatusBar :steps="steps" />
    </div>

    <!-- Result -->
    <div v-if="result" class="mt-4 p-4 rounded-lg bg-green-900/20 border border-green-800 text-green-400 text-sm">
      <template v-if="result.announced">
        Post published and announced on-chain.
      </template>
      <template v-else>
        Post published to Swarm (not announced on-chain yet).
        On-chain announcement will be available once the contract is deployed.
      </template>
      <div class="mt-2 font-mono text-xs text-gray-500 break-all">
        Post: {{ result.contentRef }}<br />
        Submission: {{ result.submissionRef }}
      </div>
    </div>

    <!-- Error -->
    <div v-if="error && !result" class="mt-4 p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-400 text-sm">
      {{ error }}
    </div>
  </div>
</template>
