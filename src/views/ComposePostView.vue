<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePublish } from '../composables/usePublish'
import { useSubmissionsStore } from '../stores/submissions'
import { STATUS } from '../lib/submission-status.js'
import { refToHex } from '../protocol/references.js'
import PublishProgress from '../components/PublishProgress.vue'
import ImageUpload from '../components/ImageUpload.vue'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs'

const route = useRoute()
const router = useRouter()
const slug = computed(() => route.params.slug)

const postType = ref('text')
const title = ref('')
const body = ref('')
const linkUrl = ref('')
const attachments = ref([])
const bodyEl = ref(null)

const submissions = useSubmissionsStore()
const { publishPost, steps, isPublishing, result, error } = usePublish()

// Auto-navigate to thread when curator picks up the post
const trackedStatus = computed(() => {
  if (!result.value?.submissionRef) return null
  return submissions.items.find((i) => i.submissionRef === result.value.submissionRef)?.status
})

watch(trackedStatus, (status) => {
  if (status === STATUS.CURATED || status === STATUS.SETTLED) {
    const hex = refToHex(result.value.submissionRef)
    if (hex) {
      router.replace({ name: 'thread', params: { slug: slug.value, rootSubId: hex } })
    }
  }
})

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

const canSubmit = computed(() => {
  if (!title.value.trim()) return false
  if (postType.value === 'text') return !!body.value.trim() || attachments.value.length > 0
  if (postType.value === 'link') return !!linkUrl.value.trim()
  return false
})

async function handleSubmit() {
  if (!canSubmit.value) return

  const isLink = postType.value === 'link'
  const trimmedBody = body.value.trim() || undefined
  const link = isLink && linkUrl.value.trim()
    ? { url: linkUrl.value.trim() }
    : undefined
  const atts = attachments.value.length > 0 ? attachments.value : undefined

  try {
    await publishPost({
      boardSlug: slug.value,
      title: title.value.trim(),
      bodyText: trimmedBody,
      link,
      attachments: atts,
    })
  } catch {
    // Error captured in error ref
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

    <h1 class="text-2xl font-bold text-foreground mb-4">Submit to r/{{ slug }}</h1>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Post type selection -->
      <Tabs v-model="postType" class="w-full">
        <TabsList>
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="link">Link</TabsTrigger>
        </TabsList>
      </Tabs>

      <!-- Title (always) -->
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

      <!-- URL (link posts only) -->
      <div v-if="postType === 'link'">
        <label class="block text-sm text-muted-foreground mb-1">URL</label>
        <Input
          v-model="linkUrl"
          type="url"
          placeholder="https://... or bzz://..."
          :disabled="isPublishing"
        />
      </div>

      <!-- Image upload (both types) -->
      <ImageUpload
        :disabled="isPublishing"
        @uploaded="onImageUploaded"
        @removed="onImageRemoved"
      />

      <!-- Body text -->
      <div>
        <label class="block text-sm text-muted-foreground mb-1">
          {{ postType === 'link' ? 'Text (optional)' : 'Text' }}
        </label>
        <Textarea
          ref="bodyEl"
          v-model="body"
          :placeholder="postType === 'link' ? 'Add your thoughts...' : 'Write your post...'"
          :rows="postType === 'link' ? 4 : 8"
          :disabled="isPublishing"
          class="resize-y text-sm"
        />
      </div>

      <Button
        type="submit"
        :disabled="isPublishing || !canSubmit"
      >
        {{ isPublishing ? 'Publishing...' : result ? 'Published' : 'Publish Post' }}
      </Button>
    </form>

    <PublishProgress
      :steps="steps"
      :result="result"
      :error="error"
      :board-slug="slug"
    />
  </div>
</template>
