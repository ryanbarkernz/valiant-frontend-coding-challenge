<script setup>
import { computed } from 'vue'

/**
 * An auto-sizing inline select input styled for the sentence form.
 * Uses a hidden ghost <span> mirroring the selected label to drive width,
 * so the select shrinks and grows naturally with its content.
 */
const props = defineProps({
  /** The currently selected option object (must have a `name` string property) */
  modelValue: {
    type: Object,
    default: null,
  },
  /** Available options — each must have `name` (display) and a unique key field */
  options: {
    type: Array,
    required: true,
  },
  /** The property used as the <option> :key (defaults to 'code') */
  optionKey: {
    type: String,
    default: 'code',
  },
  /** Accent colour passed as an inline style value */
  accentColor: {
    type: String,
    default: 'var(--accent-color)',
  },
})

const emit = defineEmits(['update:modelValue'])

// Writable computed so Vue's v-model machinery handles object reference
// matching internally — event.target.value always returns a string which
// would lose the object shape entirely.
const selected = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})
</script>

<template>
  <div
    class="autogrow-container inline-grid border-b-2 border-dashed pb-0.5 align-middle focus-within:border-solid"
    :style="{ borderColor: accentColor }"
  >
    <!-- Ghost span drives the container width to match the selected label -->
    <span class="sentence-text invisible whitespace-pre px-2 font-bold">{{ modelValue?.name || '' }}</span>
    <select
      v-model="selected"
      class="select-sentence sentence-text cursor-pointer bg-transparent px-2 text-center font-bold focus:outline-none"
      :style="{ color: accentColor }"
    >
      <option
        v-for="opt in options"
        :key="opt[optionKey]"
        :value="opt"
      >
        {{ opt.name }}
      </option>
    </select>
  </div>
</template>
