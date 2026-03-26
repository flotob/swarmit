<script setup>
import { ref } from 'vue'
import { usePublish } from '../composables/usePublish'
import StatusBar from './StatusBar.vue'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'

const props = defineProps({
  boardSlug: String,
  parentSubmissionId: String,
  rootSubmissionId: String,
})

const emit = defineEmits(['published', 'cancel'])

const body = ref('')
const { publishReply, steps, isPublishing, result, error } = usePublish()

async function handleSubmit() {
  if (!body.value.trim()) return

  try {
    await publishReply({
      boardSlug: props.boardSlug,
      bodyText: body.value.trim(),
      parentSubmissionId: props.parentSubmissionId,
      rootSubmissionId: props.rootSubmissionId,
    })
    emit('published', result.value)
  } catch {
    // Error captured in error ref
  }
}
</script>

<template>
  <div class="mt-2 mb-4 p-3 rounded-md bg-secondary border border-border">
    <form @submit.prevent="handleSubmit">
      <Textarea
        v-model="body"
        placeholder="Write a reply..."
        rows="3"
        :disabled="isPublishing"
        class="resize-y text-sm"
      />
      <div class="flex items-center gap-2 mt-2">
        <Button
          type="submit"
          size="sm"
          :disabled="isPublishing || !body.trim()"
        >
          {{ isPublishing ? 'Replying...' : result ? 'Replied' : 'Reply' }}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          @click="$emit('cancel')"
          :disabled="isPublishing"
        >
          Cancel
        </Button>
      </div>
    </form>

    <StatusBar v-if="steps.length" :steps="steps" class="mt-3" />

    <p v-if="result" class="mt-2 text-xs text-green-600 dark:text-green-400">
      Reply published — pending curator indexing
    </p>

    <p v-if="error && !result" class="mt-2 text-xs text-destructive">
      {{ error }}
    </p>
  </div>
</template>
