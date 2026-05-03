import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'installed', component: () => import('../views/InstalledList.vue') },
  { path: '/search', name: 'search', component: () => import('../views/SkillsSearch.vue') },
  {
    path: '/skill/:packageRef',
    name: 'skill-detail',
    component: () => import('../views/SkillDetail.vue'),
    props: true
  }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})
