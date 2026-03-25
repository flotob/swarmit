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
    // Step 1: Connect
    setStep('Connect providers', 'active')
    if (!auth.walletConnected) await wallet.connect()
    if (!auth.swarmConnected) await swarm.connect()
    setStep('Connect providers', 'done', auth.userAddress)

    // Step 2: Publish board metadata
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

    // Step 3: Register on-chain
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
    <h2 class="text-2xl font-bold mb-6">Create Board</h2>

    <form @submit.prevent="handleSubmit" class="space-y-4 max-w-lg">
      <div>
        <label class="block text-sm text-gray-400 mb-1">Slug</label>
        <input
          v-model="slug"
          type="text"
          placeholder="e.g. tech, music, random"
          required
          :disabled="isCreating"
          class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500 disabled:opacity-50"
        />
        <p class="text-xs text-gray-600 mt-1">Your board will be at r/{{ slug || '...' }}</p>
      </div>

      <div>
        <label class="block text-sm text-gray-400 mb-1">Title</label>
        <input
          v-model="title"
          type="text"
          placeholder="Board display name"
          required
          :disabled="isCreating"
          class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500 disabled:opacity-50"
        />
      </div>

      <div>
        <label class="block text-sm text-gray-400 mb-1">Description</label>
        <textarea
          v-model="description"
          placeholder="What is this board about?"
          required
          rows="3"
          :disabled="isCreating"
          class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-gray-200 placeholder-gray-600 resize-y focus:outline-none focus:border-orange-500 disabled:opacity-50"
        />
      </div>

      <button
        type="submit"
        :disabled="isCreating"
        class="px-4 py-2 text-sm font-medium rounded-md bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ isCreating ? 'Creating...' : result?.registered ? 'Created — redirecting...' : 'Create Board' }}
      </button>
    </form>

    <StatusBar v-if="steps.length" :steps="steps" class="mt-6" />

    <div v-if="result" class="mt-4 p-4 rounded-lg text-sm" :class="result.registered ? 'bg-green-900/20 border border-green-800 text-green-400' : 'bg-yellow-900/20 border border-yellow-800 text-yellow-400'">
      <template v-if="result.registered">
        Board r/{{ result.slug }} created!
      </template>
      <template v-else>
        Board metadata published to Swarm (not registered on-chain yet).
      </template>
      <div class="mt-1 font-mono text-xs text-gray-500 break-all">{{ result.boardRef }}</div>
    </div>

    <div v-if="error && !result" class="mt-4 p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-400 text-sm">
      {{ error }}
    </div>
  </div>
</template>
