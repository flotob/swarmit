<script setup>
import { computed } from 'vue'
import { useSubmissionsStore } from '../stores/submissions'
import { STATUS } from '../lib/submission-status.js'
import { Check, Loader2, AlertCircle } from 'lucide-vue-next'

const props = defineProps({
  steps: Array,
  result: Object,
  error: String,
  boardSlug: String,
  isFetching: Boolean,
})

const submissions = useSubmissionsStore()

const STEP_LABELS = {
  'Ensure identity': 'Connecting...',
  'Publish post': 'Publishing content...',
  'Publish reply': 'Publishing content...',
  'Publish submission': 'Recording submission...',
  'Update user feed': 'Updating feed...',
  'Announce on-chain': 'Announcing on-chain...',
}

const totalSteps = computed(() => props.steps?.length || 0)

const completedSteps = computed(() =>
  props.steps?.filter((s) => s.status === 'done' || s.status === 'skipped').length || 0
)

const activeStep = computed(() =>
  props.steps?.find((s) => s.status === 'active')
)

const failedStep = computed(() =>
  props.steps?.find((s) => s.status === 'error')
)

const progressPercent = computed(() => {
  if (!totalSteps.value) return 0
  return Math.round((completedSteps.value / totalSteps.value) * 100)
})

const isPublishing = computed(() => !!activeStep.value)
const isComplete = computed(() => !!props.result && !activeStep.value)
const hasFailed = computed(() => !!failedStep.value)

const statusLabel = computed(() => {
  if (hasFailed.value) return failedStep.value.detail || 'Something went wrong'
  if (activeStep.value) return STEP_LABELS[activeStep.value.name] || activeStep.value.name
  return null
})

const trackedSubmission = computed(() => {
  if (!props.result?.submissionRef) return null
  return submissions.items.find((i) => i.submissionRef === props.result.submissionRef)
})

const isCurated = computed(() =>
  trackedSubmission.value?.status === STATUS.CURATED || trackedSubmission.value?.status === STATUS.SETTLED
)

const isWaiting = computed(() =>
  trackedSubmission.value?.status === STATUS.WAITING
)

const curatorName = computed(() =>
  trackedSubmission.value?.curatorPickups?.[0]?.curatorName || null
)

</script>

<template>
  <div v-if="steps?.length" class="mt-4 max-w-xl">
    <!-- Progress bar -->
    <div class="w-full h-2 bg-secondary rounded-full overflow-hidden">
      <div
        class="h-full rounded-full transition-all duration-500"
        :class="hasFailed ? 'bg-destructive' : isCurated ? 'bg-success' : 'bg-primary'"
        :style="{ width: `${progressPercent}%` }"
      />
    </div>

    <!-- Status text during publishing -->
    <div v-if="isPublishing" class="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 class="w-4 h-4 animate-spin text-primary" />
      {{ statusLabel }}
    </div>

    <!-- Error -->
    <div v-else-if="hasFailed" class="mt-2 flex items-center gap-2 text-sm text-destructive">
      <AlertCircle class="w-4 h-4" />
      {{ statusLabel }}
    </div>

    <!-- Published, waiting for curator -->
    <div v-else-if="isComplete && isWaiting" class="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 class="w-4 h-4 animate-spin text-primary" />
      Published! Waiting for curators to pick this up...
    </div>

    <!-- Curated -->
    <div v-else-if="isComplete && isCurated" class="mt-2 flex items-center gap-2 text-sm text-success">
      <Loader2 v-if="isFetching" class="w-4 h-4 animate-spin" />
      <Check v-else class="w-4 h-4" />
      Picked up{{ curatorName ? ` by ${curatorName}` : '' }}{{ isFetching ? '. Refreshing thread...' : '' }}
    </div>

    <!-- Published but not announced (no curator polling) -->
    <div v-else-if="isComplete && !isWaiting && !isCurated" class="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
      <Check class="w-4 h-4 text-success" />
      Published to Swarm.
    </div>
  </div>
</template>
