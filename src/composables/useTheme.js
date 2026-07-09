import { ref, computed } from 'vue'
import { parseAccentColor } from '../utils/parseAccentColor'

/**
 * Composable that owns theme state, query-param parsing, and CSS variable generation.
 *
 * @param {import('vue').Ref} config  Reactive config ref from the parent component.
 * @returns {{ systemIsDark, isDarkActive, updateSystemTheme, parseQueryParams, cssVariables }}
 */
export function useTheme (config) {
  // Tracks the OS-level dark preference
  const systemIsDark = ref(false)

  const updateSystemTheme = (e) => {
    systemIsDark.value = e.matches
  }

  // Resolved dark-mode state: explicit config wins, otherwise follow the OS
  const isDarkActive = computed(() => {
    if (config.value.theme === 'dark') return true
    if (config.value.theme === 'light') return false
    return systemIsDark.value
  })

  // Apply URL search params to config (used on embed mount)
  const parseQueryParams = () => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('theme')) config.value.theme = params.get('theme')
    if (params.has('accent')) config.value.accent = params.get('accent')
    if (params.has('accentDark')) config.value.accentDark = params.get('accentDark')
    if (params.has('bgLight')) config.value.bgLight = params.get('bgLight')
    if (params.has('bgDark')) config.value.bgDark = params.get('bgDark')
    if (params.has('bgTransparent')) config.value.bgTransparent = params.get('bgTransparent') === 'true'
    if (params.has('hideTitle')) config.value.hideTitle = params.get('hideTitle') === 'true'
    if (params.has('hideResults')) config.value.hideResults = params.get('hideResults') === 'true'
  }

  // CSS custom-property overrides injected onto the card root element
  const cssVariables = computed(() => {
    const vars = {}

    const accentLight = parseAccentColor(config.value.accent || '222222')
    vars['--accent-color-light-val'] = accentLight
    vars['--accent-color-light-bg'] = accentLight.startsWith('#') ? `${accentLight}1a` : accentLight

    const accentDark = parseAccentColor(config.value.accentDark || 'fffea8')
    vars['--accent-color-dark-val'] = accentDark
    vars['--accent-color-dark-bg'] = accentDark.startsWith('#') ? `${accentDark}1a` : accentDark

    // Resolve custom background settings
    if (config.value.bgTransparent) {
      vars['--bg-color'] = 'transparent'
    } else {
      if (config.value.bgLight) {
        vars['--bg-color-light-override'] = parseAccentColor(config.value.bgLight)
      }
      if (config.value.bgDark) {
        vars['--bg-color-dark-override'] = parseAccentColor(config.value.bgDark)
      }
    }

    return vars
  })

  return { systemIsDark, isDarkActive, updateSystemTheme, parseQueryParams, cssVariables }
}
