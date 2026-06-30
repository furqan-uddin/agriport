import type { ReactNode } from 'react'
import { Provider } from 'react-redux'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { Toaster } from 'react-hot-toast'
import { store } from '@/redux/store'
import { theme } from '@/theme/theme'

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: '12px',
              border: '1px solid #E2E6EC',
              background: '#fff',
              color: '#161B24',
              fontSize: '0.875rem',
              fontWeight: 500,
              boxShadow: '0 12px 32px rgba(22,27,36,0.14)',
            },
            success: { iconTheme: { primary: '#15694A', secondary: '#fff' } },
          }}
        />
      </ThemeProvider>
    </Provider>
  )
}
