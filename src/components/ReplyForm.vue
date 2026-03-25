<script setup>
import { ref } from 'vue'
import { usePublish } from '../composables/usePublish'
import StatusBar from './StatusBar.vue'

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
  <div class="mt-2 mb-4 p-3 rounded-md bg-gray-800/50 border border-gray-700">
    <form @submit.prevent="handleSubmit">
      <textarea
        v-model="body"
        placeholder="Write a reply..."
        rows="3"
        :disabled="isPublishing"
        class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-gray-200 placeholder-gray-600 font-mono text-sm resize-y focus:outline-none focus:border-orange-500 disabled:opacity-50"
      />
      <div class="flex items-center gap-2 mt-2">
        <button
          type="submit"
          :disabled="isPublishing || !body.trim()"
          class="px-3 py-1.5 text-xs font-medium rounded-md bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isPublishing ? 'Replying...' : result ? 'Replied' : 'Reply' }}
        </button>
        <button
          type="button"
          @click="$emit('cancel')"
          :disabled="isPublishing"
          class="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200"
        >
          Cancel
        </button>
      </div>
    </form>

    <!-- Progress -->
    <StatusBar v-if="steps.length" :steps="steps" class="mt-3" />

    <!-- Pending reply indicator -->
    <div v-if="result" class="mt-2 text-xs text-green-500">
      Reply published — pending curator indexing
    </div>

    <!-- Error -->
    <div v-if="error && !result" class="mt-2 text-xs text-red-400">
      {{ error }}
    </div>
  </div>
</template>
