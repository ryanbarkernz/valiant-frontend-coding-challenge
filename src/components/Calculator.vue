<!-- eslint-disable vue/multi-word-component-names -->
<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import PMT from '@/utils/PMT'

defineProps({
  isEmbedMode: {
    type: Boolean,
    default: false,
  },
})

const minAmount = 1000
const maxAmount = 20000000

// Default configuration
const config = ref({
  theme: 'auto',
  padding: 'lg',
  accent: '222222',
  accentDark: 'fffea8',
  hideTitle: false,
  hideResults: false,
})

const fieldsData = ref(null)
const fieldsLoading = ref(true)
const fieldsError = ref(false)

const amount = ref(minAmount)
const rate = ref(null)
const periods = ref(null)
const term = ref(null)
const amountTouched = ref(false)

// Track browser system dark preference
const systemIsDark = ref(false)

const updateSystemTheme = (e) => {
  systemIsDark.value = e.matches
}

// Compute if Dark mode is active based on config (light/dark/auto)
const isDarkActive = computed(() => {
  if (config.value.theme === 'dark') return true
  if (config.value.theme === 'light') return false
  return systemIsDark.value
})

// URL search query param parser
const parseQueryParams = () => {
  const params = new URLSearchParams(window.location.search)
  if (params.has('theme')) config.value.theme = params.get('theme')
  if (params.has('padding')) config.value.padding = params.get('padding')
  if (params.has('accent')) config.value.accent = params.get('accent')
  if (params.has('accentDark')) config.value.accentDark = params.get('accentDark')
  if (params.has('hideTitle')) config.value.hideTitle = params.get('hideTitle') === 'true'
  if (params.has('hideResults')) config.value.hideResults = params.get('hideResults') === 'true'
}

// Compute custom CSS variables for custom styling injection
const cssVariables = computed(() => {
  const vars = {}

  // Parse and resolve Light/Default Accent variables
  let accentLight = config.value.accent || '0055ff'
  if (!accentLight.startsWith('#')) {
    if (/^[0-9A-F]{6}$/i.test(accentLight) || /^[0-9A-F]{3}$/i.test(accentLight)) {
      accentLight = `#${accentLight}`
    }
  }
  vars['--accent-color-light-val'] = accentLight
  vars['--accent-color-light-bg'] = accentLight.startsWith('#') ? `${accentLight}1a` : accentLight

  // Parse and resolve Dark Accent variables
  let accentDark = config.value.accentDark || '38bdf8'
  if (!accentDark.startsWith('#')) {
    if (/^[0-9A-F]{6}$/i.test(accentDark) || /^[0-9A-F]{3}$/i.test(accentDark)) {
      accentDark = `#${accentDark}`
    }
  }
  vars['--accent-color-dark-val'] = accentDark
  vars['--accent-color-dark-bg'] = accentDark.startsWith('#') ? `${accentDark}1a` : accentDark

  if (config.value.padding === 'none') vars['--card-padding'] = '0px'
  else if (config.value.padding === 'sm') vars['--card-padding'] = '8px'
  else if (config.value.padding === 'md') vars['--card-padding'] = '16px'
  else if (config.value.padding === 'lg') vars['--card-padding'] = '24px'

  return vars
})

// Fetch dropdown data
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

    // Default select selections
    if (fieldsData.value.rates.length > 0) rate.value = fieldsData.value.rates[0]
    if (fieldsData.value.periods.length > 0) periods.value = fieldsData.value.periods[2] // Monthly
    if (fieldsData.value.terms.length > 0) term.value = fieldsData.value.terms[2] // 2 years
  } catch (e) {
    fieldsError.value = e.message
  } finally {
    fieldsLoading.value = false
  }
}

// Input validation
const isAmountValid = computed(() => {
  if (amount.value === null || amount.value === '') return false
  return amount.value >= minAmount && amount.value <= maxAmount
})

const amountErrorMessage = computed(() => {
  if (!amountTouched.value) return ''
  if (amount.value === null || amount.value === '') return 'Please enter a loan amount.'
  if (amount.value < minAmount) return `Minimum amount is $${minAmount.toLocaleString()}.`
  if (amount.value > maxAmount) return `Maximum amount is $${maxAmount.toLocaleString()}.`
  return ''
})

const isValid = computed(() => {
  return isAmountValid.value && rate.value && periods.value && term.value
})

// PMT Repayments Calculation
const repayments = computed(() => {
  if (!isValid.value) return null
  return PMT(
    rate.value.code / periods.value.code, // Interest rate per period
    term.value.code, // Total payment periods
    amount.value // Loan principal
  )
})

const repaymentsDisplay = computed(() => {
  if (!repayments.value) return null
  const periodRepayment = Math.abs(Math.ceil(repayments.value * 12 / periods.value.code))
  return periodRepayment.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
  })
})

const totalRepaymentsDisplay = computed(() => {
  if (!repayments.value) return null
  const totalCost = Math.abs(Math.ceil(repayments.value * term.value.code))
  return totalCost.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
  })
})

// Listen to messages from parent window
const handleMessage = (event) => {
  if (event.data && event.data.type === 'UPDATE_VALIANT_CONFIG') {
    Object.assign(config.value, event.data.config)
  }
}

const cardRef = ref(null)
let resizeObserver = null

onMounted(() => {
  parseQueryParams()
  fetchFields()
  window.addEventListener('message', handleMessage)

  // Sync and listen to prefers-color-scheme matching
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  systemIsDark.value = mediaQuery.matches
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', updateSystemTheme)
  }

  // Setup ResizeObserver to report container offsetHeight changes dynamically to parent window
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
    :style="cssVariables"
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
        :style="{ color: 'var(--bg-color)' }"
      >
        Loan Repayment Calculator
      </h2>
      <p
        class="text-sm"
        :style="{ color: 'var(--bg-color)', opacity: '0.7' }"
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
      <!-- Footer -->
      <hr class="border-dashed border-neutral-300 dark:border-neutral-800">
      <div class="flex flex-col items-center justify-center gap-1">
        <a
          href="https://www.valiantfinance.com/"
          target="_blank"
          rel="noopener noreferrer"
          class="group flex flex-col items-center gap-1"
        >
          <span class="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 transition-colors group-hover:text-neutral-600 dark:text-neutral-500 dark:group-hover:text-neutral-300">
            Powered by
          </span>
          <img
            :src="isDarkActive ? 'https://cdn.prod.website-files.com/673a45999b5a833529515830/69015e6c8ec38017de4c9616_Logo%20-%20Light.svg' : 'https://cdn.prod.website-files.com/673a45999b5a833529515830/673c1d91f74c14275f7e8aa1_Valiant-LOGO-RGB-blk.svg'"
            alt="Valiant Finance"
            class="h-7 opacity-75 transition-opacity group-hover:opacity-100"
          >
        </a>
      </div>
    </div>
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
          class="text-xs mt-4 rounded bg-red-100 px-3 py-1.5 font-semibold text-red-700 transition hover:bg-red-200"
          @click="fetchFields"
        >
          Retry Connection
        </button>
      </div>
      <!-- Footer -->
      <hr class="border-dashed border-neutral-300 dark:border-neutral-800">
      <div class="flex flex-col items-center justify-center gap-1">
        <a
          href="https://www.valiantfinance.com/"
          target="_blank"
          rel="noopener noreferrer"
          class="group flex flex-col items-center gap-1"
        >
          <span class="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 transition-colors group-hover:text-neutral-600 dark:text-neutral-500 dark:group-hover:text-neutral-300">
            Powered by
          </span>
          <img
            :src="isDarkActive ? 'https://cdn.prod.website-files.com/673a45999b5a833529515830/69015e6c8ec38017de4c9616_Logo%20-%20Light.svg' : 'https://cdn.prod.website-files.com/673a45999b5a833529515830/673c1d91f74c14275f7e8aa1_Valiant-LOGO-RGB-blk.svg'"
            alt="Valiant Finance"
            class="h-7 opacity-75 transition-opacity group-hover:opacity-100"
          >
        </a>
      </div>
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
            <span class="sentence-text invisible whitespace-pre font-bold">{{ amount || '' }}</span>
            <input
              id="amount-input"
              v-model.number="amount"
              type="number"
              :min="minAmount"
              :max="maxAmount"
              class="sentence-text bg-transparent text-left font-bold focus:outline-none"
              :style="{ color: 'var(--accent-color)' }"
              @input="amountTouched = true"
            >
          </div>
        </div>
        <br class="block min-[480px]:hidden">
        for
        <div
          class="autogrow-container inline-grid border-b-2 border-dashed pb-0.5 align-middle focus-within:border-solid"
          :style="{ borderColor: 'var(--accent-color)' }"
        >
          <span class="sentence-text invisible whitespace-pre px-2 font-bold">{{ rate?.name || '' }}</span>
          <select
            v-model="rate"
            class="select-sentence sentence-text cursor-pointer bg-transparent px-2 text-center font-bold focus:outline-none"
            :style="{ color: 'var(--accent-color)' }"
          >
            <option
              v-for="opt in fieldsData?.rates"
              :key="opt.code"
              :value="opt"
            >
              {{ opt.name }}
            </option>
          </select>
        </div>
        <br>
        repaid
        <div
          class="autogrow-container inline-grid border-b-2 border-dashed pb-0.5 align-middle focus-within:border-solid"
          :style="{ borderColor: 'var(--accent-color)' }"
        >
          <span class="sentence-text invisible whitespace-pre px-2 font-bold">{{ periods?.name || '' }}</span>
          <select
            v-model="periods"
            class="select-sentence sentence-text cursor-pointer bg-transparent px-2 text-center font-bold focus:outline-none"
            :style="{ color: 'var(--accent-color)' }"
          >
            <option
              v-for="opt in fieldsData?.periods"
              :key="opt.code"
              :value="opt"
            >
              {{ opt.name }}
            </option>
          </select>
        </div>
        <br class="block min-[480px]:hidden">
        over
        <div
          class="autogrow-container inline-grid border-b-2 border-dashed pb-0.5 align-middle focus-within:border-solid"
          :style="{ borderColor: 'var(--accent-color)' }"
        >
          <span class="sentence-text invisible whitespace-pre px-2 font-bold">{{ term?.name || '' }}</span>
          <select
            v-model="term"
            class="select-sentence sentence-text cursor-pointer bg-transparent px-2 text-center font-bold focus:outline-none"
            :style="{ color: 'var(--accent-color)' }"
          >
            <option
              v-for="opt in fieldsData?.terms"
              :key="opt.code"
              :value="opt"
            >
              {{ opt.name }}
            </option>
          </select>
        </div>
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
      <!-- Footer -->
      <hr class="border-dashed border-neutral-300 dark:border-neutral-800">
      <div class="flex flex-col items-center justify-center gap-1">
        <a
          href="https://www.valiantfinance.com/"
          target="_blank"
          rel="noopener noreferrer"
          class="group flex flex-col items-center gap-1"
        >
          <span class="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 transition-colors group-hover:text-neutral-600 dark:text-neutral-500 dark:group-hover:text-neutral-300">
            Powered by
          </span>
          <img
            :src="isDarkActive ? 'https://cdn.prod.website-files.com/673a45999b5a833529515830/69015e6c8ec38017de4c9616_Logo%20-%20Light.svg' : 'https://cdn.prod.website-files.com/673a45999b5a833529515830/673c1d91f74c14275f7e8aa1_Valiant-LOGO-RGB-blk.svg'"
            alt="Valiant Finance"
            class="h-7 opacity-75 transition-opacity group-hover:opacity-100"
          >
        </a>
      </div>
    </div>
  </div>
</template>
