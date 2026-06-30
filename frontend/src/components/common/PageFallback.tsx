import { Box, CircularProgress } from '@mui/material'

/** Suspense fallback shown while a lazily-loaded route chunk downloads. */
export default function PageFallback() {
  return (
    <Box sx={{ minHeight: '50vh', display: 'grid', placeItems: 'center' }}>
      <CircularProgress size={30} thickness={4} />
    </Box>
  )
}
