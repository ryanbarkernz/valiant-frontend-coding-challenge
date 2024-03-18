import { createApp } from 'vue'
import '@/style.css'
import App from '@/App.vue'
import PrimeVue from 'primevue/config'
import Lara from '@/vendor/presets/lara'

const app = createApp(App)

app.use(PrimeVue, {
  pt: Lara,
})

app.mount('#app')
