import { createRouter, createWebHashHistory } from 'vue-router'
import { ref } from 'vue'

export const isNavigating = ref(false)

const routes = [
  { path: '/', name: 'installed', component: () => import('../views/InstalledList.vue') },
  { path: '/search', name: 'search', component: () => import('../views/SkillsSearch.vue') },
  {
    path: '/skill/:packageRef',
    name: 'skill-detail',
    component: () => import('../views/SkillDetail.vue'),
    props: true
  },
  { path: '/agent-view', name: 'agent-view', component: () => import('../views/AgentView.vue') },
  { path: '/env', name: 'env', component: () => import('../views/SettingsView.vue') },
  { path: '/settings', name: 'settings', component: () => import('../views/SettingsView.vue') }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach(() => {
  isNavigating.value = true
})

router.afterEach(() => {
  isNavigating.value = false
})

router.onError(() => {
  isNavigating.value = false
})
