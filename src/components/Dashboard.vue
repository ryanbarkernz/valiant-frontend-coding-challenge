<!-- eslint-disable vue/multi-word-component-names -->
<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

// ---------- State ----------
const accentLight = ref('#222222')
const accentDark = ref('#fffea8')
const selectedTheme = ref('auto') // 'light' | 'dark' | 'auto'

const iframeRef = ref(null)
const copied = ref(false)
const activeTab = ref('embed') // 'embed' | 'docs' | 'postmessage'
const iframeHeight = ref('280px')

// ---------- System Dark Mode Tracking ----------
const systemIsDark = ref(false)

const updateSystemTheme = (e) => {
  systemIsDark.value = e.matches
}

let handleResizeMessage = null

onMounted(() => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  systemIsDark.value = mediaQuery.matches
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', updateSystemTheme)
  }

  // Handle auto-resizing iframe from the widget child window height reports
  handleResizeMessage = (event) => {
    if (event.data && event.data.type === 'VALIANT_EMBED_RESIZE') {
      iframeHeight.value = `${event.data.height}px`
    }
  }
  window.addEventListener('message', handleResizeMessage)
})

onBeforeUnmount(() => {
  if (handleResizeMessage) {
    window.removeEventListener('message', handleResizeMessage)
  }
})

// ---------- Derived ----------
// Dashboard itself always follows system preference
const dashboardIsDark = computed(() => systemIsDark.value)

// Preview area follows the selected theme toggle
const themePreviewIsDark = computed(() => {
  if (selectedTheme.value === 'dark') return true
  if (selectedTheme.value === 'light') return false
  return systemIsDark.value
})

// Sync the HTML document class for the dashboard shell only (always auto)
watch(dashboardIsDark, (isDark) => {
  if (isDark) {
    document.documentElement.classList.add('dark')
    document.documentElement.style.backgroundColor = '#262c2d'
  } else {
    document.documentElement.classList.remove('dark')
    document.documentElement.style.backgroundColor = '#f8f8ff'
  }
}, { immediate: true })

const embedUrl = computed(() => {
  const origin = window.location.origin + window.location.pathname
  const params = new URLSearchParams()
  params.set('embed', 'true')
  params.set('theme', selectedTheme.value)
  params.set('accent', accentLight.value.replace('#', ''))
  params.set('accentDark', accentDark.value.replace('#', ''))
  return `${origin}?${params.toString()}`
})

// Stable URL for the live preview iframe — no theme/accent in src to prevent full reloads.
// Config is pushed via postMessage instead.
const previewSrc = computed(() => {
  const origin = window.location.origin + window.location.pathname
  return `${origin}?embed=true`
})

const onPreviewLoad = () => {
  sendPostMessage({
    theme: selectedTheme.value,
    accent: accentLight.value.replace('#', ''),
    accentDark: accentDark.value.replace('#', ''),
  })
}

// Update default sizes when layout changes
onMounted(() => {
  iframeHeight.value = '260px'
})

const iframeCode = computed(() =>
  `<iframe\n  src="${embedUrl.value}"\n  width="100%"\n  height="${iframeHeight.value}"\n  style="border: none; overflow: hidden; background: transparent;"\n  scrolling="auto"\n></iframe>`
)

// ---------- Actions ----------
const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(iframeCode.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to copy text: ', err)
  }
}

const sendPostMessage = (configPayload) => {
  if (iframeRef.value?.contentWindow) {
    iframeRef.value.contentWindow.postMessage(
      { type: 'UPDATE_VALIANT_CONFIG', config: configPayload },
      '*'
    )
  }
}

// Sync every control change to the live preview via postMessage
watch([selectedTheme, accentLight, accentDark], () => {
  sendPostMessage({
    theme: selectedTheme.value,
    accent: accentLight.value.replace('#', ''),
    accentDark: accentDark.value.replace('#', ''),
  })
}, { deep: true })
</script>

<template>
  <div class="font-sans flex min-h-screen flex-col bg-[#f8f8ff] text-neutral-800 transition-colors duration-300 dark:bg-[#262c2d] dark:text-neutral-100">
    <!-- Header -->
    <header class="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white/80 px-6 py-4 backdrop-blur-md transition-colors duration-300 dark:border-neutral-900 dark:bg-[#262c2d]/80">
      <div class="flex items-center gap-3">
        <img
          :src="dashboardIsDark ? 'https://cdn.prod.website-files.com/673a45999b5a833529515830/69015e6c8ec38017de4c9616_Logo%20-%20Light.svg' : 'https://cdn.prod.website-files.com/673a45999b5a833529515830/673c1d91f74c14275f7e8aa1_Valiant-LOGO-RGB-blk.svg'"
          alt="Valiant Finance"
          class="h-6 w-auto transition-opacity duration-300"
        >
      </div>
    </header>

    <!-- Main Workspace -->
    <div class="flex flex-1 flex-col overflow-hidden lg:flex-row">
      <!-- Left Sidebar: Configuration Controls -->
      <aside class="w-full shrink-0 space-y-5 overflow-y-auto border-r border-neutral-200 bg-neutral-50 p-6 transition-colors duration-300 lg:w-[380px] dark:border-neutral-900 dark:bg-neutral-900/30">
        <div>
          <h3 class="text-lg mb-1 font-bold tracking-wider text-neutral-800 dark:text-neutral-200">
            Configuration Panel
          </h3>
          <p class="text-sm text-neutral-500 dark:text-neutral-400" />
        </div>

        <hr class="border-neutral-200 dark:border-neutral-700">

        <!-- Colour Mode Selector -->
        <div class="space-y-2">
          <label class="text-base font-semibold text-neutral-700 dark:text-neutral-300">Colour Mode</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="t in ['light', 'dark', 'auto']"
              :key="t"
              :class="[
                'rounded-lg border px-3 py-2 text-center text-sm font-semibold capitalize transition',
                selectedTheme === t
                  ? 'border-blue-500 bg-blue-600/10 text-blue-600 dark:text-blue-400'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200',
              ]"
              @click="selectedTheme = t"
            >
              {{ t }}
            </button>
          </div>
        </div>

        <!-- Accent Colour — Light -->
        <div class="space-y-2">
          <label class="text-base font-semibold text-neutral-700 dark:text-neutral-300">
            Accent Colour — Light Mode
          </label>
          <div class="flex items-center gap-3">
            <input
              v-model="accentLight"
              type="color"
              class="size-9 cursor-pointer rounded-lg border border-neutral-200 bg-white p-0.5 dark:border-neutral-700 dark:bg-neutral-900"
            >
            <input
              v-model="accentLight"
              type="text"
              class="font-mono flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-blue-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
              placeholder="#0055ff"
            >
          </div>
        </div>

        <!-- Accent Colour — Dark -->
        <div class="space-y-2">
          <label class="text-base font-semibold text-neutral-700 dark:text-neutral-300">
            Accent Colour — Dark Mode
          </label>
          <div class="flex items-center gap-3">
            <input
              v-model="accentDark"
              type="color"
              class="size-9 cursor-pointer rounded-lg border border-neutral-200 bg-white p-0.5 dark:border-neutral-700 dark:bg-neutral-900"
            >
            <input
              v-model="accentDark"
              type="text"
              class="font-mono text-xs flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-neutral-800 focus:border-blue-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
              placeholder="#38bdf8"
            >
          </div>
        </div>

        <hr class="border-neutral-200 dark:border-neutral-800">
      </aside>

      <!-- Right: Live Preview + Code -->
      <main class="flex flex-1 flex-col gap-6 overflow-y-auto bg-neutral-50 p-6 transition-colors duration-300 dark:bg-neutral-950">
        <!-- Preview Panel -->
        <div class="flex min-h-[320px] flex-1 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition-colors duration-300 dark:border-neutral-900 dark:bg-neutral-900/10">
          <div class="flex items-center justify-between border-b border-neutral-200 bg-neutral-100/50 px-4 py-3 transition-colors duration-300 dark:border-neutral-900 dark:bg-neutral-900/50">
            <div class="flex items-center gap-2">
              <span class="size-2 animate-ping rounded-full bg-emerald-500" />
              <span class="text-sm font-bold text-neutral-700 dark:text-neutral-300">Live Preview</span>
            </div>
            <div class="font-mono text-[10px] text-neutral-500 dark:text-neutral-500">
              {{ selectedTheme }}
            </div>
          </div>

          <div
            class="flex flex-1 items-center justify-center p-6 transition-colors duration-300"
            :class="themePreviewIsDark ? 'bg-neutral-950 text-white' : 'bg-white text-neutral-900'"
          >
            <!-- Wrapper with a dotted border around the iframe bounds for display purposes only -->
            <!-- Configured with Tailwind resize-x to test responsive layout spacing manually -->
            <div
              class="w-full resize-x overflow-hidden border-2 border-dotted p-1"
              :class="[
                themePreviewIsDark ? 'border-neutral-800' : 'border-neutral-300',
              ]"
              style="min-width: 280px;"
            >
              <iframe
                ref="iframeRef"
                :src="previewSrc"
                class="w-full bg-transparent"
                :style="{ height: iframeHeight, overflow: 'hidden' }"
                frameborder="0"
                scrolling="no"
                @load="onPreviewLoad"
              />
            </div>
          </div>
        </div>

        <!-- Code & Docs Tabs -->
        <div class="overflow-hidden rounded-xl border border-neutral-200 bg-white transition-colors duration-300 dark:border-neutral-900 dark:bg-neutral-900/10">
          <div class="flex border-b border-neutral-200 bg-neutral-100/50 transition-colors duration-300 dark:border-neutral-900 dark:bg-neutral-900/20">
            <button
              :class="[
                'border-b-2 px-4 py-3 text-sm font-bold transition',
                activeTab === 'embed'
                  ? 'border-blue-500 bg-blue-500/[0.02] text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200',
              ]"
              @click="activeTab = 'embed'"
            >
              HTML Embed Code
            </button>
            <button
              :class="[
                'border-b-2 px-4 py-3 text-sm font-bold transition',
                activeTab === 'docs'
                  ? 'border-blue-500 bg-blue-500/[0.02] text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200',
              ]"
              @click="activeTab = 'docs'"
            >
              Query Param Docs
            </button>
            <button
              :class="[
                'border-b-2 px-4 py-3 text-sm font-bold transition',
                activeTab === 'postmessage'
                  ? 'border-blue-500 bg-blue-500/[0.02] text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200',
              ]"
              @click="activeTab = 'postmessage'"
            >
              postMessage API
            </button>
          </div>

          <!-- Embed Code Tab -->
          <div
            v-if="activeTab === 'embed'"
            class="space-y-4 p-5"
          >
            <p class="text-sm text-neutral-500 dark:text-neutral-400">
              Paste the snippet below into your site. Config is baked into the iframe URL query params.
            </p>
            <div class="relative">
              <pre class="font-mono overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-[11px] leading-relaxed text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">{{ iframeCode }}</pre>
              <button
                :class="[
                  'absolute right-3 top-3 rounded-md px-3 py-1.5 text-sm font-bold transition',
                  copied ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-500',
                ]"
                @click="copyCode"
              >
                {{ copied ? '✓ Copied' : 'Copy Code' }}
              </button>
            </div>
          </div>

          <!-- Docs Tab -->
          <div
            v-if="activeTab === 'docs'"
            class="max-h-[300px] space-y-4 overflow-y-auto p-5"
          >
            <h4 class="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
              URL Parameters
            </h4>
            <div class="divide-y divide-neutral-200 text-sm dark:divide-neutral-900">
              <div class="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-start">
                <span class="font-mono shrink-0 rounded bg-blue-500/10 px-1.5 py-0.5 font-bold text-blue-600 dark:text-blue-400">embed=true</span>
                <span class="text-neutral-600 dark:text-neutral-400">Required. Activates standalone embed mode, removing the developer dashboard shell.</span>
              </div>
              <div class="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-start">
                <span class="font-mono shrink-0 rounded bg-blue-500/10 px-1.5 py-0.5 font-bold text-blue-600 dark:text-blue-400">theme=[light|dark|auto]</span>
                <span class="text-neutral-600 dark:text-neutral-400">Sets the base colour palette. Defaults to <code>auto</code> which responds to prefers-color-scheme.</span>
              </div>
              <div class="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-start">
                <span class="font-mono shrink-0 rounded bg-blue-500/10 px-1.5 py-0.5 font-bold text-blue-600 dark:text-blue-400">accent=[hex]</span>
                <span class="text-neutral-600 dark:text-neutral-400">Brand accent colour in light mode (no #). E.g. <code>accent=fa5252</code>.</span>
              </div>
              <div class="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-start">
                <span class="font-mono shrink-0 rounded bg-blue-500/10 px-1.5 py-0.5 font-bold text-blue-600 dark:text-blue-400">accentDark=[hex]</span>
                <span class="text-neutral-600 dark:text-neutral-400">Brand accent colour in dark mode (no #). E.g. <code>accentDark=38bdf8</code>.</span>
              </div>
            </div>
          </div>

          <!-- postMessage Tab -->
          <div
            v-if="activeTab === 'postmessage'"
            class="space-y-4 p-5"
          >
            <div class="space-y-2">
              <h4 class="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                Dynamic Scripting
              </h4>
              <p class="text-sm text-neutral-500 dark:text-neutral-400">
                Push config updates to the widget at runtime — no iframe reload needed. Perfect for syncing your site's own light/dark mode toggle.
              </p>
            </div>
            <pre class="font-mono overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-[11px] leading-relaxed text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
const frame = document.querySelector('iframe').contentWindow;

frame.postMessage({
  type: 'UPDATE_VALIANT_CONFIG',
  config: {
    theme: 'dark',
    accent: '0055ff',
    accentDark: '38bdf8',
  }
}, '*');</pre>
            <div class="flex flex-wrap gap-2">
              <button
                class="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-bold transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                @click="sendPostMessage({ theme: 'dark', accent: accentLight.replace('#', ''), accentDark: accentDark.replace('#', '') }); selectedTheme = 'dark'"
              >
                → Dark Mode
              </button>
              <button
                class="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-bold transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                @click="sendPostMessage({ theme: 'light', accent: accentLight.replace('#', ''), accentDark: accentDark.replace('#', '') }); selectedTheme = 'light'"
              >
                → Light Mode
              </button>
              <button
                class="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-bold transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                @click="sendPostMessage({ theme: 'auto', accent: accentLight.replace('#', ''), accentDark: accentDark.replace('#', '') }); selectedTheme = 'auto'"
              >
                → Auto Theme
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
