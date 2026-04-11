<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePublish } from '../composables/usePublish'
import { useSubmissionsStore } from '../stores/submissions'
import { STATUS } from '../lib/submission-status.js'
import { refToHex } from '../protocol/references.js'
import BoardPicker from './BoardPicker.vue'
import PublishProgress from './PublishProgress.vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'

const props = defineProps({
  open: { type: Boolean, default: false },
  sourceBoardSlug: { type: String, required: true },
  sourceSubmissionRef: { type: String, required: true },
  contentRef: { type: String, required: true },
})

const emit = defineEmits(['update:open'])

const router = useRouter()
const submissions = useSubmissionsStore()
const { publishCrosspost, steps, isPublishing, result, error } = usePublish()

const targetSlug = ref(null)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && !result.value) targetSlug.value = null
  },
)

const canSubmit = computed(() => !!targetSlug.value && !isPublishing.value && !result.value)

async function handleCrosspost() {
  if (!canSubmit.value) return
  try {
    await publishCrosspost({
      targetBoardSlug: targetSlug.value,
      contentRef: props.contentRef,
      sourceBoardSlug: props.sourceBoardSlug,
      sourceSubmissionRef: props.sourceSubmissionRef,
    })
  } catch {
    // Error surfaced via error ref / PublishProgress
  }
}

const trackedStatus = computed(() => {
  if (!result.value?.submissionRef) return null
  return submissions.items.find((i) => i.submissionRef === result.value.submissionRef)?.status
})

watch(trackedStatus, (status) => {
  if (status === STATUS.CURATED || status === STATUS.SETTLED) {
    const hex = refToHex(result.value.submissionRef)
    if (hex && targetSlug.value) {
      emit('update:open', false)
      router.push({ name: 'thread', params: { slug: targetSlug.value, rootSubId: hex } })
    }
  }
})
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Crosspost</DialogTitle>
        <DialogDescription>
          Share this post to another board. The original post and author are preserved.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-2">
        <label class="block text-sm text-muted-foreground">Target board</label>
        <BoardPicker
          v-model="targetSlug"
          :exclude-slug="sourceBoardSlug"
          :disabled="isPublishing || !!result"
        />
      </div>

      <PublishProgress
        :steps="steps"
        :result="result"
        :error="error"
        :board-slug="targetSlug"
      />

      <DialogFooter>
        <Button variant="ghost" @click="emit('update:open', false)">
          {{ result ? 'Close' : 'Cancel' }}
        </Button>
        <Button :disabled="!canSubmit" @click="handleCrosspost">
          {{ isPublishing ? 'Crossposting...' : result ? 'Crossposted' : `Crosspost${targetSlug ? ` to r/${targetSlug}` : ''}` }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
