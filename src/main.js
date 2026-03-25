import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { persistQueryClient } from '@tanstack/query-persist-client-core'
import { get, set, del } from 'idb-keyval'
import router from './router'
import App from './App.vue'
import './style.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      gcTime: 1000 * 60 * 60 * 24, // 24h — keep cached data in IndexedDB
    },
  },
})

// Persist query cache to IndexedDB via idb-keyval
persistQueryClient({
  queryClient,
  persister: {
    persistClient: async (client) => {
      await set('swarmit-query-cache', client)
    },
    restoreClient: async () => {
      return await get('swarmit-query-cache')
    },
    removeClient: async () => {
      await del('swarmit-query-cache')
    },
  },
  maxAge: 1000 * 60 * 60 * 24, // 24h
})

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(VueQueryPlugin, { queryClient })

app.mount('#app')
