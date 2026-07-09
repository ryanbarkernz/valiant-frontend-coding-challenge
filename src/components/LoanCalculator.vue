<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import PMT from '@/utils/PMT'
import { useTheme } from '@/composables/useTheme'
import { useAmountInput } from '@/composables/useAmountInput'
import PoweredByFooter from './PoweredByFooter.vue'
import SentenceSelect from './SentenceSelect.vue'

defineProps({
  isEmbedMode: {
    type: Boolean,
    default: false,
  },
})

const MIN_AMOUNT = 1000
const MAX_AMOUNT = 20000000

// ---------- Config ----------
const config = ref({
  theme: 'auto',
  accent: '222222',
  accentDark: 'fffea8',
  bgLight: 'ffffff',
  bgDark: '0a0a0a',
  bgTransparent: false,
  hideTitle: false,
  hideResults: false,
})

// ---------- Theme (dark/light, query params, CSS vars) ----------
const { systemIsDark, isDarkActive, updateSystemTheme, parseQueryParams, cssVariables } = useTheme(config)

// ---------- Fields data ----------
const fieldsData = ref(null)
const fieldsLoading = ref(true)
const fieldsError = ref(false)

const rate = ref(null)
const periods = ref(null)
const term = ref(null)

// ---------- Amount input (digit formatting, validation, cursor tracking) ----------
const {
  displayAmount,
  amountNum,
  isAmountValid,
  amountErrorMessage,
  handleAmountKeydown,
  handleAmountInput,
} = useAmountInput(MIN_AMOUNT, MAX_AMOUNT)

// ---------- Form validity ----------
const isValid = computed(() =>
  isAmountValid.value && rate.value && periods.value && term.value
)

// ---------- PMT calculation ----------
const repayments = computed(() => {
  if (!isValid.value) return null
  return PMT(
    rate.value.code / periods.value.code, // Interest rate per period
    term.value.code, // Total payment periods
    amountNum.value // Loan principal
  )
})

const repaymentsDisplay = computed(() => {
  if (!repayments.value) return null
  const periodRepayment = Math.ceil(Math.abs(repayments.value * 12 / periods.value.code))
  return periodRepayment.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
  })
})

const totalRepaymentsDisplay = computed(() => {
  if (!repayments.value) return null
  const totalCost = Math.ceil(Math.abs(repayments.value * term.value.code))
  return totalCost.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
  })
})

// ---------- API ----------
const fetchFields = async () => {
  try {
    fieldsLoading.value = true
    const urls = [
      'http://localhost:5000/loan-purposes',
      'http://localhost:5000/requested-repayment-periods',
      'http://localhost:5000/requested-term-months',
    ]

    const responses = await Promise.all(urls.map(url => fetch(url)))
    const errorResponses = responses.filter(response => !response.ok)
    if (errorResponses.length > 0) {
      throw new Error('One or more network responses were not ok')
    }

    const responseData = await Promise.all(responses.map(response => response.json()))

    fieldsData.value = {
      rates: responseData[0].map(item => ({
        name: item.label,
        code: item.annualRate,
        value: item.value,
      })),
      periods: responseData[1].map(item => ({
        name: item.label,
        code: item.value,
      })),
      terms: responseData[2].map(item => ({
        name: item.label,
        code: item.value,
      })),
    }

    // Default selections
    if (fieldsData.value.rates.length > 0) rate.value = fieldsData.value.rates[0]
    if (fieldsData.value.periods.length > 0) periods.value = fieldsData.value.periods[2] // Monthly
    if (fieldsData.value.terms.length > 0) term.value = fieldsData.value.terms[2] // 2 years
  } catch (e) {
    fieldsError.value = e.message
  } finally {
    fieldsLoading.value = false
  }
}

// ---------- postMessage bridge ----------
const handleMessage = (event) => {
  if (event.data && event.data.type === 'UPDATE_VALIANT_CONFIG') {
    Object.assign(config.value, event.data.config)
  }
}

// ---------- ResizeObserver (reports iframe height to parent) ----------
const cardRef = ref(null)
let resizeObserver = null

onMounted(() => {
  parseQueryParams()
  fetchFields()
  window.addEventListener('message', handleMessage)

  // Sync and listen to prefers-color-scheme
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  systemIsDark.value = mediaQuery.matches
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', updateSystemTheme)
  }

  // Report height changes to parent window
  let lastSentHeight = 0
  let resizeDebounce = null
  if (window.ResizeObserver && cardRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      clearTimeout(resizeDebounce)
      resizeDebounce = setTimeout(() => {
        for (const entry of entries) {
          const newHeight = entry.target.offsetHeight
          if (Math.abs(newHeight - lastSentHeight) > 2) {
            lastSentHeight = newHeight
            window.parent.postMessage({
              type: 'VALIANT_EMBED_RESIZE',
              height: newHeight,
            }, '*')
          }
        }
      }, 50)
    })
    resizeObserver.observe(cardRef.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('message', handleMessage)
  if (resizeObserver && cardRef.value) {
    resizeObserver.unobserve(cardRef.value)
  }
})
</script>

<template>
  <div
    ref="cardRef"
    :class="[
      'custom-card flex w-full flex-col overflow-y-auto',
      isDarkActive ? 'theme-dark dark' : 'theme-light',
    ]"
    :style="[cssVariables, { backgroundColor: 'var(--bg-color)' }]"
  >
    <!-- Title -->
    <div
      v-if="!config.hideTitle"
      class="flex flex-col items-center text-center"
      :style="{
        backgroundColor: 'var(--accent-color)',
        borderBottomLeftRadius: '2.5rem',
        borderBottomRightRadius: '2.5rem',
        padding: 'var(--card-padding)',
      }"
    >
      <h2
        class="font-bold"
        :style="{ color: isDarkActive ? '#000000' : '#ffffff' }"
      >
        Loan Repayment Calculator
      </h2>
      <p
        class="text-sm"
        :style="{ color: isDarkActive ? '#000000' : '#ffffff', opacity: '0.7' }"
      >
        Calculate your quick loan estimate
      </p>
    </div>

    <!-- Loader -->
    <div
      v-if="fieldsLoading"
      class="flex flex-1 flex-col gap-6"
      :style="{ padding: 'var(--card-padding)' }"
    >
      <div class="flex flex-1 items-center justify-center">
        <svg
          class="size-8 animate-spin"
          :style="{ color: 'var(--accent-color)' }"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      <PoweredByFooter :is-dark-active="isDarkActive" />
    </div>

    <!-- Error -->
    <div
      v-else-if="fieldsError"
      class="flex flex-1 flex-col gap-6"
      :style="{ padding: 'var(--card-padding)' }"
    >
      <div class="flex flex-1 flex-col items-center justify-center text-center text-red-500">
        <p class="text-sm font-medium">
          Failed to load calculator options.
        </p>
        <button
          class="mt-4 rounded bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-200"
          @click="fetchFields"
        >
          Retry Connection
        </button>
      </div>
      <PoweredByFooter :is-dark-active="isDarkActive" />
    </div>

    <!-- Calculator Fields -->
    <div
      v-else-if="fieldsData"
      class="flex flex-1 flex-col gap-6"
      :style="{ padding: 'var(--card-padding)' }"
    >
      <!-- Sentence Layout -->
      <form
        class="sentence-text pb-1 text-center font-medium leading-relaxed transition-all"
        @submit.prevent
      >
        I need
        <div
          class="inline-flex items-center border-b-2 border-dashed pb-0.5 align-middle focus-within:border-solid"
          :style="{ borderColor: 'var(--accent-color)' }"
        >
          <span
            class="sentence-text font-bold"
            :style="{ color: 'var(--accent-color)' }"
          >$</span>
          <div class="autogrow-container autogrow-amount">
            <span class="sentence-text invisible whitespace-pre font-bold">{{ displayAmount || '\u00a0' }}</span>
            <input
              id="amount-input"
              :value="displayAmount"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              class="sentence-text bg-transparent text-left font-bold focus:outline-none"
              :style="{ color: 'var(--accent-color)' }"
              @keydown="handleAmountKeydown"
              @input="handleAmountInput"
            >
          </div>
        </div>
        <br class="block min-[480px]:hidden">
        for
        <SentenceSelect
          v-model="rate"
          :options="fieldsData?.rates ?? []"
          option-key="value"
        />
        <br>
        repaid
        <SentenceSelect
          v-model="periods"
          :options="fieldsData?.periods ?? []"
        />
        <br class="block min-[480px]:hidden">
        over
        <SentenceSelect
          v-model="term"
          :options="fieldsData?.terms ?? []"
        />
      </form>

      <hr class="border-dashed border-neutral-300 dark:border-neutral-800">

      <!-- Results area wrapper — relative anchor for error overlay -->
      <div class="relative">
        <!-- Results — always rendered to hold space; dims when error is active -->
        <div
          class="flex flex-col items-center transition-all duration-300"
          :class="amountErrorMessage ? 'opacity-30 blur-sm pointer-events-none' : 'opacity-100'"
          :style="{ borderTopColor: 'var(--border-color)' }"
        >
          <div class="mb-3 text-base font-semibold text-slate-400">
            Estimated Repayments:
          </div>

          <h3
            class="font-extrabold leading-[1.1] transition"
            :style="{ color: 'var(--accent-color)' }"
          >
            {{ repaymentsDisplay ?? 'N/A' }}
          </h3>

          <div class="text-base font-medium text-slate-400">
            per {{ { Weekly: 'week', Fortnightly: 'fortnight', Monthly: 'month' }[periods?.name] ?? periods?.name?.toLowerCase() ?? 'period' }}
          </div>

          <div
            v-if="!config.hideResults"
            class="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 rounded px-3 py-1 text-center text-base font-semibold [&:has(>span:nth-child(2):not(:last-child))]:flex-col [&:has(>span:nth-child(2):not(:last-child))]:items-start"
            :style="{
              backgroundColor: isDarkActive ? 'var(--input-bg)' : 'rgba(0,0,0,0.03)',
              color: 'var(--text-muted)',
            }"
          >
            <span>Total Repayments: <span
              class="font-bold"
              :style="{ color: 'var(--text-main)' }"
            >{{ totalRepaymentsDisplay ?? 'N/A' }}</span></span>
            <span>Rate: <span
              class="font-bold"
              :style="{ color: 'var(--text-main)' }"
            >{{ rate?.code != null ? `${(rate.code * 100).toFixed(1)}% p.a.` : 'N/A' }}</span></span>
          </div>
        </div>

        <!-- Error message — sibling of results, not affected by its opacity -->
        <Transition name="crossfade">
          <div
            v-if="amountErrorMessage"
            class="absolute inset-0 flex items-center justify-center text-center text-base font-semibold text-rose-500"
          >
            {{ amountErrorMessage }}
          </div>
        </Transition>
      </div>

      <PoweredByFooter :is-dark-active="isDarkActive" />
    </div>
  </div>
</template>
