import { createRouter, createWebHistory, type Router } from 'vue-router'

import HomeView from '../views/HomeView.vue'

export function createEditorRouter(): Router {
  return createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
      {
        path: '/',
        name: 'home',
        component: HomeView,
      },
    ],
  })
}
