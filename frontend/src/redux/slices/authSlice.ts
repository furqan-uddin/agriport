import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  // Access token kept in memory only (per security guidance — never localStorage).
  accessToken: string | null
  status: 'authenticated' | 'unauthenticated'
}

const STORAGE_KEY = 'agriport_auth'

const loadInitialState = (): AuthState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        user: parsed.user ?? null,
        accessToken: parsed.accessToken ?? null,
        status: parsed.status ?? 'unauthenticated',
      }
    }
  } catch {
    // ignore
  }
  return {
    user: null,
    accessToken: null,
    status: 'unauthenticated',
  }
}

const authSlice = createSlice({
  name: 'auth',
  initialState: loadInitialState(),
  reducers: {
    signIn: (state, action: PayloadAction<{ token: string; user: User }>) => {
      state.user = action.payload.user
      state.accessToken = action.payload.token
      state.status = 'authenticated'
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            user: state.user,
            accessToken: state.accessToken,
            status: state.status,
          })
        )
      } catch {
        // ignore
      }
    },
    signOut: (state) => {
      state.user = null
      state.accessToken = null
      state.status = 'unauthenticated'
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // ignore
      }
    },
    updateProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              user: state.user,
              accessToken: state.accessToken,
              status: state.status,
            })
          )
        } catch {
          // ignore
        }
      }
    },
  },
})

export const { signIn, signOut, updateProfile } = authSlice.actions
export default authSlice.reducer
