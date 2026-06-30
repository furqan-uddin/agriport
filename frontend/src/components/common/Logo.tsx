import { useState } from 'react'
import { Box, Typography } from '@mui/material'

interface LogoProps {
  /** Controls rendered height (px). */
  size?: number
  /** Kept for API compatibility — the image lockup already includes the wordmark. */
  showWordmark?: boolean
  /** On dark backgrounds, render on a white chip so the green wordmark stays legible. */
  light?: boolean
}

const SRC = '/logo3.png'

/** Text fallback shown until the logo image is dropped into /public. */
function Wordmark({ size }: { size: number }) {
  return (
    <Typography
      sx={{
        fontFamily: '"Bricolage Grotesque", serif',
        fontWeight: 800,
        fontSize: size * 0.62,
        letterSpacing: '-0.02em',
        lineHeight: 1,
      }}
    >
      <Box component="span" sx={{ color: 'var(--brand-800)' }}>agri</Box>
      <Box component="span" sx={{ color: 'var(--brand-500)' }}>port</Box>
    </Typography>
  )
}

export default function Logo({ size = 40, light = false }: LogoProps) {
  const [errored, setErrored] = useState(false)
  const height = Math.round(size * 1.55)

  const content = errored ? (
    <Wordmark size={size} />
  ) : (
    <img
      src={SRC}
      alt="Agriport"
      onError={() => setErrored(true)}
      style={{ height, width: 'auto', display: 'block', objectFit: 'contain' }}
    />
  )

  if (light) {
    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          bgcolor: '#fff',
          borderRadius: 2.5,
          px: 1.25,
          py: 0.75,
          boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
        }}
      >
        {content}
      </Box>
    )
  }
  return <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>{content}</Box>
}
