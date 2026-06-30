import type { SxProps, Theme } from '@mui/material'

// Shared DataGrid styling so every admin table reads as one component.
export const gridSx: SxProps<Theme> = {
  border: 'none',
  fontSize: 13.5,
  '--DataGrid-rowBorderColor': 'var(--ink-100)',
  '& .MuiDataGrid-columnHeaders': {
    bgcolor: 'var(--ink-50)',
  },
  '& .MuiDataGrid-columnHeaderTitle': {
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: 'var(--ink-500)',
  },
  '& .MuiDataGrid-cell': {
    display: 'flex',
    alignItems: 'center',
  },
  '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': { outline: 'none' },
  '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': { outline: 'none' },
  '& .MuiDataGrid-row:hover': { bgcolor: 'var(--brand-50)' },
  '& .MuiDataGrid-footerContainer': { borderTop: '1px solid var(--ink-200)' },
  '& .tnum': { fontVariantNumeric: 'tabular-nums' },
}
