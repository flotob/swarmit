<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePublish } from '../composables/usePublish'
import StatusBar from '../components/StatusBar.vue'
import ImageUpload from '../components/ImageUpload.vue'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Alert, AlertDescription } from '../components/ui/alert'

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

  const textarea = bodyEl.value?.$el || bodyEl.value
  if (textarea) {
    const name = descriptor.name || 'image'
    const syntax = `![${name}](${descriptor.reference})`
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = body.value
    body.value = text.slice(0, start) + syntax + text.slice(end)

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
    <Button variant="ghost" size="sm" as-child class="mb-4">
      <router-link :to="{ name: 'board', params: { slug } }">
        &larr; r/{{ slug }}
      </router-link>
    </Button>

    <h1 class="text-2xl font-bold text-foreground mb-6">Submit to r/{{ slug }}</h1>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label class="block text-sm text-muted-foreground mb-1">Title</label>
        <Input
          v-model="title"
          type="text"
          placeholder="Post title"
          required
          :disabled="isPublishing"
        />
      </div>

      <div>
        <label class="block text-sm text-muted-foreground mb-1">Body (markdown)</label>
        <Textarea
          ref="bodyEl"
          v-model="body"
          placeholder="Write your post..."
          required
          rows="8"
          :disabled="isPublishing"
          class="resize-y text-sm"
        />
      </div>

      <ImageUpload
        :disabled="isPublishing"
        @uploaded="onImageUploaded"
        @removed="onImageRemoved"
      />

      <Button
        type="submit"
        :disabled="isPublishing || !title.trim() || !body.trim()"
      >
        {{ isPublishing ? 'Publishing...' : result ? 'Published' : 'Publish Post' }}
      </Button>
    </form>

    <div v-if="steps.length" class="mt-6">
      <StatusBar :steps="steps" />
    </div>

    <Alert v-if="result" class="mt-4 border-success/30">
      <AlertDescription>
        <template v-if="result.announced">
          Post published and announced on-chain.
        </template>
        <template v-else>
          Post published to Swarm (not announced on-chain yet).
        </template>
        <div class="mt-2 font-mono text-xs text-muted-foreground break-all">
          Post: {{ result.contentRef }}<br />
          Submission: {{ result.submissionRef }}
        </div>
      </AlertDescription>
    </Alert>

    <Alert v-if="error && !result" variant="destructive" class="mt-4">
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>
  </div>
</template>
