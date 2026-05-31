import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { APP_NAME } from '../../shared/constants'
import './assets/main.css'

// 监听系统暗黑模式偏好并同步到 html[data-theme]
function syncTheme(): void {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
}
syncTheme()
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncTheme)

// 消除 Chrome 对非 passive wheel/touch 事件监听器的警告（Naive UI 内部组件引起）
const origAddEventListener = EventTarget.prototype.addEventListener
EventTarget.prototype.addEventListener = function (
  type: string,
  listener: EventListenerOrEventListenerObject | null,
  options?: boolean | AddEventListenerOptions
): void {
  const isScrollBlocking = type === 'wheel' || type === 'touchstart' || type === 'touchmove'
  if (isScrollBlocking && options === undefined) {
    options = { passive: true }
  } else if (isScrollBlocking && typeof options === 'object' && options.passive === undefined) {
    options = { ...options, passive: true }
  }
  origAddEventListener.call(this, type, listener, options)
}

document.title = APP_NAME

const app = createApp(App)
app.config.errorHandler = (err, _instance, info) => {
  console.error(`[Vue Error] ${info}:`, err)
}
app.use(createPinia())
app.use(router)
app.mount('#app')
