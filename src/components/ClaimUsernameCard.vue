<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { formatEther } from 'ethers'
import { validateUsername, normalizeUsernameInput } from 'swarmit-protocol/usernames'
import {
  getCurrentUsernamePrice,
  getOwnedTokens,
  claimUsername,
  setPrimaryUsername,
} from '../chain/username-registry.js'
import { waitForReceipt } from '../lib/rpc.js'
import { useUsernamesStore } from '../stores/usernames.js'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { Skeleton } from './ui/skeleton'
import { Check } from 'lucide-vue-next'

const props = defineProps({
  address: { type: String, required: true },
})

const usernamesStore = useUsernamesStore()

const isLoading = ref(true)
const loadError = ref(null)
const ownedTokens = ref([])
const currentPrice = ref(0n)

const showClaimForm = ref(false)
const inputValue = ref('')
const normalized = computed(() => normalizeUsernameInput(inputValue.value))
const validationErrors = computed(() => normalized.value ? validateUsername(normalized.value) : [])
const isValid = computed(() => normalized.value.length > 0 && validationErrors.value.length === 0)
const isClaiming = ref(false)
const claimError = ref(null)

const settingTokenId = ref(null)
const setPrimaryError = ref(null)

const SLIPPAGE_BUFFER_PCT = 10n
const slippageMaxPrice = computed(() => (currentPrice.value * (100n + SLIPPAGE_BUFFER_PCT)) / 100n)

async function loadState() {
  isLoading.value = true
  loadError.value = null
  try {
    const [owned, price] = await Promise.all([
      getOwnedTokens(props.address),
      getCurrentUsernamePrice(),
    ])
    ownedTokens.value = owned.tokens
    currentPrice.value = price
  } catch (err) {
    loadError.value = err?.message || 'Failed to load username state'
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await loadState()
  // Auto-open claim form only on first mount for users with no username
  if (!ownedTokens.value.length) showClaimForm.value = true
})
watch(() => props.address, loadState)

async function assertReceiptOk(txHash) {
  const receipt = await waitForReceipt(txHash)
  if (receipt.status === '0x0') throw new Error('Transaction reverted on-chain')
  return receipt
}

async function claim() {
  if (!isValid.value || isClaiming.value) return
  isClaiming.value = true
  claimError.value = null
  try {
    // Re-fetch price right before sending so the slippage cap matches current state
    const freshPrice = await getCurrentUsernamePrice()
    currentPrice.value = freshPrice
    const maxPriceWei = (freshPrice * (100n + SLIPPAGE_BUFFER_PCT)) / 100n

    const txHash = await claimUsername({ name: normalized.value, maxPriceWei })
    await assertReceiptOk(txHash)

    usernamesStore.invalidate(props.address)
    inputValue.value = ''
    showClaimForm.value = false
    await loadState()
  } catch (err) {
    claimError.value = err?.message || 'Claim failed'
  } finally {
    isClaiming.value = false
  }
}

async function setPrimary(tokenId) {
  if (settingTokenId.value !== null) return
  settingTokenId.value = tokenId
  setPrimaryError.value = null
  try {
    const txHash = await setPrimaryUsername(tokenId)
    await assertReceiptOk(txHash)
    usernamesStore.invalidate(props.address)
    await loadState()
  } catch (err) {
    setPrimaryError.value = err?.message || 'Failed to set primary'
  } finally {
    settingTokenId.value = null
  }
}

// formatEther returns e.g. "1.0" — trim a trailing ".0" for display
function formatXDai(wei) {
  const s = formatEther(wei)
  return s.endsWith('.0') ? s.slice(0, -2) : s
}
</script>

<template>
  <Card class="mt-6">
    <CardHeader>
      <CardTitle class="text-base">Username</CardTitle>
    </CardHeader>
    <CardContent class="space-y-3">
      <div v-if="isLoading" class="space-y-2">
        <Skeleton class="h-4 w-1/2" />
        <Skeleton class="h-8 w-full" />
      </div>

      <Alert v-else-if="loadError" variant="destructive">
        <AlertDescription>{{ loadError }}</AlertDescription>
      </Alert>

      <template v-else>
        <p v-if="!ownedTokens.length && !showClaimForm" class="text-sm text-muted-foreground">
          You don't own a username yet.
        </p>

        <div v-if="ownedTokens.length === 1">
          <p class="text-sm text-muted-foreground">Your primary username:</p>
          <p class="text-lg font-semibold text-foreground mt-0.5">{{ ownedTokens[0].name }}</p>
        </div>

        <div v-if="ownedTokens.length > 1" class="space-y-2">
          <p class="text-sm text-muted-foreground">You own {{ ownedTokens.length }} usernames:</p>
          <div
            v-for="token in ownedTokens"
            :key="token.tokenId.toString()"
            class="flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-border"
          >
            <span class="font-semibold text-foreground">{{ token.name }}</span>
            <Badge v-if="token.isPrimary" class="text-xs">
              <Check class="w-3 h-3 mr-1" /> primary
            </Badge>
            <Button
              v-else
              size="sm"
              variant="outline"
              :disabled="settingTokenId !== null"
              @click="setPrimary(token.tokenId)"
            >
              {{ settingTokenId === token.tokenId ? 'Setting…' : 'Set as primary' }}
            </Button>
          </div>
          <Alert v-if="setPrimaryError" variant="destructive">
            <AlertDescription>{{ setPrimaryError }}</AlertDescription>
          </Alert>
        </div>

        <div v-if="showClaimForm" class="space-y-2 pt-2 border-t border-border">
          <label class="text-sm font-medium text-foreground">Claim a username</label>
          <Input
            v-model="inputValue"
            :placeholder="'e.g. alice'"
            :disabled="isClaiming"
            autocomplete="off"
          />
          <p v-if="normalized && normalized !== inputValue" class="text-xs text-muted-foreground">
            Will be normalized to: <span class="font-mono">{{ normalized }}</span>
          </p>
          <ul v-if="validationErrors.length" class="text-xs text-destructive space-y-0.5">
            <li v-for="err in validationErrors" :key="err">{{ err }}</li>
          </ul>
          <p class="text-xs text-muted-foreground">
            Current price: <span class="font-mono">{{ formatXDai(currentPrice) }} xDAI</span>.
            The price rises slightly with each successful mint; we'll cap at
            <span class="font-mono">{{ formatXDai(slippageMaxPrice) }} xDAI</span>
            (10% buffer) to protect against drift. The contract refunds any overpayment.
          </p>
          <div class="flex gap-2">
            <Button :disabled="!isValid || isClaiming" @click="claim">
              {{ isClaiming ? 'Claiming…' : 'Claim username' }}
            </Button>
            <Button
              v-if="ownedTokens.length"
              variant="ghost"
              :disabled="isClaiming"
              @click="showClaimForm = false"
            >
              Cancel
            </Button>
          </div>
          <Alert v-if="claimError" variant="destructive">
            <AlertDescription>{{ claimError }}</AlertDescription>
          </Alert>
        </div>

        <Button
          v-if="ownedTokens.length && !showClaimForm"
          variant="outline"
          size="sm"
          @click="showClaimForm = true"
        >
          Claim another username
        </Button>
      </template>
    </CardContent>
  </Card>
</template>
