<script setup>
import { ref, onMounted, computed } from 'vue'
import PMT from '@/utils/PMT'

defineOptions({
  name: 'App',
})

const minAmount = 1000
const maxAmount = 20000000

const fieldsData = ref(null)
const fieldsLoading = ref(true)
const fieldsError = ref(false)
const amount = ref(minAmount)
const rate = ref(null)
const periods = ref(null)
const term = ref(null)

const fetchFields = async () => {
  try {
    fieldsLoading.value = true

    // Array of URLs to fetch data from
    const urls = [
      'http://localhost:5000/loan-purposes',
      'http://localhost:5000/requested-repayment-periods',
      'http://localhost:5000/requested-term-months',
    ]

    // Fetch data from multiple sources concurrently
    const responses = await Promise.all(urls.map(url => fetch(url)))

    // Check if any responses are not ok
    const errorResponses = responses.filter(response => !response.ok)
    if (errorResponses.length > 0) {
      throw new Error('One or more network responses were not ok')
    }

    // Parse response data from each response
    const responseData = await Promise.all(responses.map(response => response.json()))

    // Store the parsed response data and prep for inputs
    fieldsData.value = {
      rates: responseData[0].map(item => ({
        name: item.label,
        code: item.annualRate,
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
  } catch (e) {
    fieldsError.value = e.message
  } finally {
    fieldsLoading.value = false
  }
}

const repayments = computed(() => {
  if (!rate.value || !periods.value || !term.value) return null
  return PMT(
    rate.value.code / periods.value.code, // Divide the annual rate by the number of repayment periods in the year.
    term.value.code, // 2 year loan term means there are 24 monthly repayment periods.
    amount.value // Present value, i.e., the principal of the loan, is 30000.
  )
})

const repaymentsDisplay = computed(() => {
  // PMT always returns monthly cost so we compute the weekly / fortnightly / monthly cost here
  return repayments.value ? Math.abs(Math.ceil(repayments.value * 12 / periods.value.code)).toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 }) : null
})

const totalRepaymentsDisplay = computed(() => {
  // We are rounding up cents in the display but need to ensure we're including the cents in the total cost calculation before rounding
  return repayments.value ? Math.abs(Math.ceil(repayments.value * term.value.code)).toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 }) : null
})

onMounted(() => {
  fetchFields()
})
</script>

<template>
  <div
    class="mx-auto flex min-h-screen max-w-screen-xl flex-col items-center justify-center p-4 font-inter lg:p-8"
  >
    <div v-if="fieldsLoading">
      <svg
        class="-ml-1 mr-3 size-5 animate-spin text-white"
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
    <div
      v-else-if="fieldsError"
      class="text-center text-sm underline decoration-pink-500"
    >
      {{ fieldsError }}
    </div>
    <form
      v-else-if="fieldsData"
      class="w-full text-center text-2xl"
    >
      I need $<input
        id="amount"
        v-model.number="amount"
        type="number"
        :min="minAmount"
        :max="maxAmount"
        class="my-2 w-[6.7em] rounded border border-gray-300 px-2 py-1 text-center text-2xl focus:outline-none focus:ring-2 focus:ring-blue-400"
      > for
      <select
        v-model="rate"
        :class="['my-2 w-[10.5em] rounded border border-gray-300 px-2 py-1 text-left text-2xl focus:outline-none focus:ring-2 focus:ring-blue-400', rate === null ? 'text-slate-400' : 'text-gray-900']"
      >
        <option
          :value="null"
          disabled
        >
          Loan purpose
        </option>
        <option
          v-for="opt in fieldsData?.rates"
          :key="opt.code"
          :value="opt"
        >
          {{ opt.name }}
        </option>
      </select> repaid
      <select
        v-model="periods"
        :class="['my-2 w-[6.7em] rounded border border-gray-300 px-2 py-1 text-left text-2xl focus:outline-none focus:ring-2 focus:ring-blue-400', periods === null ? 'text-slate-400' : 'text-gray-900']"
      >
        <option
          :value="null"
          disabled
        >
          Periods
        </option>
        <option
          v-for="opt in fieldsData?.periods"
          :key="opt.code"
          :value="opt"
        >
          {{ opt.name }}
        </option>
      </select> over
      <select
        v-model="term"
        :class="['my-2 w-[6.7em] rounded border border-gray-300 px-2 py-1 text-left text-2xl focus:outline-none focus:ring-2 focus:ring-blue-400', term === null ? 'text-slate-400' : 'text-gray-900']"
      >
        <option
          :value="null"
          disabled
        >
          Term
        </option>
        <option
          v-for="opt in fieldsData?.terms"
          :key="opt.code"
          :value="opt"
        >
          {{ opt.name }}
        </option>
      </select>
    </form>

    <template v-if="repaymentsDisplay">
      <div class="my-6 flex w-full items-center gap-4">
        <hr class="flex-1 border-dotted border-gray-300">
        <b>Results 🎉</b>
        <hr class="flex-1 border-dotted border-gray-300">
      </div>
      <div class="text-center text-2xl">
        <h3 class="text-green-600 underline decoration-green-600">
          {{ repaymentsDisplay }} {{ periods.name }} repayments
        </h3>
        <small class="text-slate-400">{{ totalRepaymentsDisplay }} Total repayments</small>
      </div>
    </template>
  </div>
</template>
