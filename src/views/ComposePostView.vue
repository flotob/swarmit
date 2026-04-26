<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePublish } from '../composables/usePublish'
import { useSubmissionsStore } from '../stores/submissions'
import { STATUS } from '../lib/submission-status.js'
import { refToHex } from '../protocol/references.js'
import PublishProgress from '../components/PublishProgress.vue'
import ImageUpload from '../components/ImageUpload.vue'
import BoardPicker from '../components/BoardPicker.vue'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs'
import ReadOnlyBanner from '../components/ReadOnlyBanner.vue'
import { useReadOnly } from '../composables/useReadOnly'

const route = useRoute()
const router = useRouter()

// Slug is either from the route (/r/:slug/submit) or picked in the
// form (/submit). Effective slug is what the form actually uses.
const slugFromRoute = computed(() => route.params.slug || null)
const selectedSlug = ref(null)
const effectiveSlug = computed(() => slugFromRoute.value || selectedSlug.value)

const postType = ref(route.query.kind === 'link' ? 'link' : 'text')
const title = ref('')
const body = ref('')
const linkUrl = ref('')
const attachments = ref([])

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
    if (hex && effectiveSlug.value) {
      router.replace({ name: 'thread', params: { slug: effectiveSlug.value, rootSubId: hex } })
    }
  }
})

function onImageUploaded(descriptor) {
  attachments.value.push(descriptor)
}

function onImageRemoved(descriptor) {
  attachments.value = attachments.value.filter((a) => a.reference !== descriptor.reference)
}

const { isReadOnly } = useReadOnly()

const canSubmit = computed(() => {
  if (isReadOnly.value) return false
  if (!effectiveSlug.value) return false
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
      boardSlug: effectiveSlug.value,
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
  <div class="max-w-2xl mx-auto">
    <Button variant="ghost" size="sm" as-child class="mb-4">
      <router-link v-if="slugFromRoute" :to="{ name: 'board', params: { slug: slugFromRoute } }">
        &larr; r/{{ slugFromRoute }}
      </router-link>
      <router-link v-else :to="{ name: 'home' }">
        &larr; Home
      </router-link>
    </Button>

    <ReadOnlyBanner />

    <h1 class="text-2xl font-bold text-foreground mb-4">
      {{ slugFromRoute ? `Submit to r/${slugFromRoute}` : 'Submit a post' }}
    </h1>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <Tabs v-model="postType" class="w-full">
        <TabsList>
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="link">Link</TabsTrigger>
        </TabsList>
      </Tabs>

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

      <div v-if="postType === 'link'">
        <label class="block text-sm text-muted-foreground mb-1">URL</label>
        <Input
          v-model="linkUrl"
          type="url"
          placeholder="https://... or bzz://..."
          :disabled="isPublishing"
        />
      </div>

      <ImageUpload
        :disabled="isPublishing"
        @uploaded="onImageUploaded"
        @removed="onImageRemoved"
      />

      <div>
        <label class="block text-sm text-muted-foreground mb-1">
          {{ postType === 'link' ? 'Text (optional)' : 'Text' }}
        </label>
        <Textarea
          v-model="body"
          :placeholder="postType === 'link' ? 'Add your thoughts...' : 'Write your post...'"
          :rows="postType === 'link' ? 4 : 8"
          :disabled="isPublishing"
          class="resize-y text-sm"
        />
      </div>

      <div v-if="!slugFromRoute">
        <label class="block text-sm text-muted-foreground mb-1">Board</label>
        <BoardPicker v-model="selectedSlug" :disabled="isPublishing" />
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
      :board-slug="effectiveSlug"
    />
  </div>
</template>
