import { configureStore } from '@reduxjs/toolkit'
import { api } from './api'
import authReducer from './slices/authSlice'
import cartReducer from './slices/cartSlice'
import storefrontReducer, { STOREFRONT_STORAGE_KEY } from './slices/storefrontSlice'
import { injectStore } from './apiClient'

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    auth: authReducer,
    cart: cartReducer,
    storefront: storefrontReducer,
  },
  middleware: (getDefault) => getDefault().concat(api.middleware),
})

injectStore(store)

// Persist storefront content to localStorage so executive edits survive reloads
// and reflect across the customer app (frontend-only, no backend).
let lastStorefront = store.getState().storefront
store.subscribe(() => {
  const current = store.getState().storefront
  if (current !== lastStorefront) {
    lastStorefront = current
    try {
      localStorage.setItem(STOREFRONT_STORAGE_KEY, JSON.stringify(current))
    } catch {
      /* ignore quota / serialization errors */
    }
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
