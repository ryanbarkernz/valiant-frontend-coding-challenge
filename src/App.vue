<script setup>
import { computed, defineAsyncComponent } from 'vue'
import Calculator from '@/components/Calculator.vue'

defineOptions({
  name: 'App',
})

// Detect if running inside an iframe or loaded with '?embed=true' query parameter
const isEmbedded = computed(() => {
  return window.self !== window.top || new URLSearchParams(window.location.search).get('embed') === 'true'
})

// Lazy-load the Dashboard so it is emitted as a separate JS + CSS chunk.
// Embed-mode users never trigger this import, so they never download dashboard code.
const Dashboard = defineAsyncComponent(() => import('@/components/Dashboard.vue'))
</script>

<template>
  <!-- Standalone Embed mode - no outer layouts or decorations -->
  <div
    v-if="isEmbedded"
    class="flex min-h-screen w-full items-center justify-center bg-transparent"
  >
    <Calculator
      :is-embed-mode="true"
      class="w-full max-w-4xl"
    />
  </div>

  <!-- Interactive preview sandbox dashboard -->
  <div v-else>
    <Dashboard />
  </div>
</template>
