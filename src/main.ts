import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import AddModules from './modules/index'
import { initWaltivaThemeSystem } from './utils/waltivaTheme'
import { initSmartArtCompatibilityFix } from './utils/smartArtFix'

initWaltivaThemeSystem()
initSmartArtCompatibilityFix()

const app = createApp(App)
AddModules({ app, router })
app.use(createPinia())
app.use(router)
app.mount('#app')
