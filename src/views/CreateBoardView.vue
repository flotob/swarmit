<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWallet } from '../composables/useWallet'
import { useSwarm } from '../composables/useSwarm'
import { useAuthStore } from '../stores/auth'
import { buildBoard, validate } from '../protocol/objects.js'
import { registerBoard } from '../chain/transactions.js'
import { isContractConfigured } from '../chain/contract.js'
import StatusBar from '../components/StatusBar.vue'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Alert, AlertDescription } from '../components/ui/alert'

const router = useRouter()
const wallet = useWallet()
const swarm = useSwarm()
const auth = useAuthStore()

const slug = ref('')
const title = ref('')
const description = ref('')

const steps = ref([])
const isCreating = ref(false)
const result = ref(null)
const error = ref(null)

const STEP_NAMES = ['Connect providers', 'Publish board metadata', 'Register on-chain']

const slugPattern = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

async function handleSubmit() {
  const s = slug.value.trim().toLowerCase()
  const t = title.value.trim()
  const d = description.value.trim()
  if (!s || !t || !d) return

  if (!slugPattern.test(s) || s.length > 32) {
    error.value = 'Slug must start/end with a letter or number, contain only a-z 0-9 hyphens, and be at most 32 characters.'
    return
  }

  isCreating.value = true
  error.value = null
  result.value = null
  steps.value = STEP_NAMES.map((name) => ({ name, status: 'pending', detail: '' }))

  function setStep(name, status, detail) {
    const step = steps.value.find((st) => st.name === name)
    if (step) { step.status = status; step.detail = detail || '' }
  }

  try {
    setStep('Connect providers', 'active')
    if (!auth.walletConnected) await wallet.connect()
    if (!auth.swarmConnected) await swarm.connect()
    setStep('Connect providers', 'done', auth.userAddress)

    setStep('Publish board metadata', 'active')
    const board = buildBoard({
      slug: s,
      title: t,
      description: d,
      governance: { chainId: 100, type: 'eoa', address: auth.userAddress },
    })
    const { valid, errors } = validate(board)
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`)

    const pubResult = await swarm.publishJSON(board, 'board')
    setStep('Publish board metadata', 'done', pubResult.bzzUrl)

    let registered = false
    if (isContractConfigured()) {
      setStep('Register on-chain', 'active')
      try {
        const tx = await registerBoard(s, pubResult.bzzUrl)
        setStep('Register on-chain', 'done', `tx: ${tx}`)
        registered = true
      } catch (txErr) {
        setStep('Register on-chain', 'error', txErr.message)
      }
    } else {
      setStep('Register on-chain', 'skipped', 'Contract not configured')
    }

    result.value = { boardRef: pubResult.bzzUrl, registered, slug: s }

    if (registered) {
      setTimeout(() => router.push({ name: 'board', params: { slug: s } }), 1500)
    }
  } catch (err) {
    const active = steps.value.find((st) => st.status === 'active')
    if (active) { active.status = 'error'; active.detail = err.message }
    error.value = err.message
  } finally {
    isCreating.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-foreground mb-6">Create Board</h1>

    <form @submit.prevent="handleSubmit" class="space-y-4 max-w-lg">
      <div>
        <label class="block text-sm text-muted-foreground mb-1">Slug</label>
        <Input
          v-model="slug"
          type="text"
          placeholder="e.g. tech, music, random"
          required
          :disabled="isCreating"
        />
        <p class="text-xs text-muted-foreground mt-1">Your board will be at r/{{ slug || '...' }}</p>
      </div>

      <div>
        <label class="block text-sm text-muted-foreground mb-1">Title</label>
        <Input
          v-model="title"
          type="text"
          placeholder="Board display name"
          required
          :disabled="isCreating"
        />
      </div>

      <div>
        <label class="block text-sm text-muted-foreground mb-1">Description</label>
        <Textarea
          v-model="description"
          placeholder="What is this board about?"
          required
          rows="3"
          :disabled="isCreating"
          class="resize-y"
        />
      </div>

      <Button type="submit" :disabled="isCreating">
        {{ isCreating ? 'Creating...' : result?.registered ? 'Created — redirecting...' : result ? 'Published (not registered)' : 'Create Board' }}
      </Button>
    </form>

    <StatusBar v-if="steps.length" :steps="steps" class="mt-6" />

    <Alert v-if="result" class="mt-4" :class="result.registered ? 'border-success/30' : 'border-warning/30'">
      <AlertDescription>
        <template v-if="result.registered">
          Board r/{{ result.slug }} created!
        </template>
        <template v-else>
          Board metadata published to Swarm (not registered on-chain yet).
        </template>
        <div class="mt-1 font-mono text-xs text-muted-foreground break-all">{{ result.boardRef }}</div>
      </AlertDescription>
    </Alert>

    <Alert v-if="error && !result" variant="destructive" class="mt-4">
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>
  </div>
</template>
