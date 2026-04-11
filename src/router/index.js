import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/FeedView.vue') },
    { path: '/boards', name: 'boards', component: () => import('../views/HomeView.vue') },
    { path: '/r/:slug', name: 'board', component: () => import('../views/BoardView.vue') },
    { path: '/r/:slug/submit', name: 'compose-post', component: () => import('../views/ComposePostView.vue') },
    { path: '/r/:slug/comments/:rootSubId', name: 'thread', component: () => import('../views/ThreadView.vue') },
    { path: '/u/:address', name: 'user-profile', component: () => import('../views/UserProfileView.vue') },
    { path: '/curators', name: 'curators', component: () => import('../views/CuratorPickerView.vue') },
    { path: '/create-board', name: 'create-board', component: () => import('../views/CreateBoardView.vue') },
    { path: '/activity/:submissionRef', name: 'submission-detail', component: () => import('../views/SubmissionDetailView.vue') },
  ],
})

export default router
