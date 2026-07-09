import { defineConfig } from 'cypress'
import vitePreprocessor from 'cypress-vite'

export default defineConfig({
  e2e: {
    setupNodeEvents (on) {
      on('file:preprocessor', vitePreprocessor())
      on('before:browser:launch', (browser = {}, launchOptions) => {
        if (browser.family === 'chromium') {
          // Disable GPU and sandboxing features causing IPC termination on Windows
          launchOptions.args.push('--disable-gpu')
          launchOptions.args.push('--no-sandbox')
          launchOptions.args.push('--disable-software-rasterizer')
          return launchOptions
        }
      })
    },
    specPattern: 'tests/e2e/specs/**',
    supportFile: 'tests/e2e/support/e2e.js',
  },
})
