import { ref, computed } from 'vue'

/**
 * Composable that manages the loan-amount text input.
 *
 * Keeps `amount` as a raw digit string internally while displaying a
 * comma-formatted value in the DOM.  Cursor position is tracked by
 * digit count so it survives comma insertion / removal on every keystroke,
 * including Backspace / Delete adjacent to a comma character.
 *
 * @param {number} minAmount  Minimum valid loan amount (e.g. 1000)
 * @param {number} maxAmount  Maximum valid loan amount (e.g. 20000000)
 * @returns composable state and event handlers
 */
export function useAmountInput (minAmount, maxAmount) {
  // Raw digit string — no commas.  Used for all numeric operations.
  const amount = ref(String(minAmount))
  const amountTouched = ref(false)

  // Comma-formatted display value (e.g. '10,000') — bound to the input via :value
  const displayAmount = computed(() =>
    amount.value ? Number(amount.value).toLocaleString() : ''
  )

  // Parsed integer — used for validation and the PMT calculation
  const amountNum = computed(() => {
    const n = parseInt(amount.value, 10)
    return isNaN(n) ? null : n
  })

  const isAmountValid = computed(() => {
    if (amountNum.value === null) return false
    return amountNum.value >= minAmount && amountNum.value <= maxAmount
  })

  const amountErrorMessage = computed(() => {
    if (!amountTouched.value) return ''
    if (amountNum.value === null || amount.value === '') return 'Please enter a loan amount.'
    if (amountNum.value < minAmount) return `Minimum amount is $${minAmount.toLocaleString()}.`
    if (amountNum.value > maxAmount) return `Maximum amount is $${maxAmount.toLocaleString()}.`
    return ''
  })

  /**
   * Strip non-digits from the current input value, cap at 8 raw digits,
   * format with commas, write back to the DOM, and restore the cursor to
   * the position that corresponds to digitsBeforeCursor digits into the
   * formatted string.
   *
   * Tracking cursor by digit count (not character index) means commas
   * being added or removed don't shift the cursor unexpectedly.
   */
  function applyFormattedAmount (input, digitsBeforeCursor) {
    const digits = input.value.replace(/\D/g, '').slice(0, 8)
    amount.value = digits
    const formatted = digits ? Number(digits).toLocaleString() : ''
    input.value = formatted

    let seen = 0
    let cursor = formatted.length
    if (digitsBeforeCursor === 0) {
      cursor = 0
    } else {
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) seen++
        if (seen === digitsBeforeCursor) { cursor = i + 1; break }
      }
    }
    input.setSelectionRange(cursor, cursor)
  }

  /**
   * Intercept Backspace / Delete BEFORE the browser acts so that pressing
   * either key while the cursor is adjacent to a comma deletes the
   * neighbouring digit rather than doing nothing.
   */
  function handleAmountKeydown (e) {
    if (e.key !== 'Backspace' && e.key !== 'Delete') return
    const input = e.target
    const { selectionStart: start, selectionEnd: end, value } = input
    if (start !== end) return // selection — let browser handle; input event reformats after

    if (e.key === 'Backspace' && start > 0 && !/\d/.test(value[start - 1])) {
      // Cursor is directly after a comma — delete the digit before the comma instead
      e.preventDefault()
      input.value = value.slice(0, start - 2) + value.slice(start)
      const digitsBeforeCursor = input.value.slice(0, Math.max(0, start - 2)).replace(/\D/g, '').length
      applyFormattedAmount(input, digitsBeforeCursor)
      amountTouched.value = true
    } else if (e.key === 'Delete' && start < value.length && !/\d/.test(value[start])) {
      // Cursor is directly before a comma — delete the digit after the comma instead
      e.preventDefault()
      input.value = value.slice(0, start) + value.slice(start + 2)
      const digitsBeforeCursor = input.value.slice(0, start).replace(/\D/g, '').length
      applyFormattedAmount(input, digitsBeforeCursor)
      amountTouched.value = true
    }
  }

  /** Standard input handler: reformat and restore cursor by digit count. */
  function handleAmountInput (e) {
    const input = e.target
    const digitsBeforeCursor = input.value.slice(0, input.selectionStart).replace(/\D/g, '').length
    applyFormattedAmount(input, digitsBeforeCursor)
    amountTouched.value = true
  }

  return {
    amount,
    amountTouched,
    displayAmount,
    amountNum,
    isAmountValid,
    amountErrorMessage,
    handleAmountKeydown,
    handleAmountInput,
  }
}
