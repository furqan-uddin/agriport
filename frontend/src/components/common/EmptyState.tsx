import { Box, Typography, Button } from '@mui/material'
import type { ReactNode } from 'react'

interface Props {
  icon?: ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({ icon, title, description, actionLabel, onAction }: Props) {
  return (
    <Box className="flex flex-col items-center justify-center text-center py-16 px-6">
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          background: 'linear-gradient(145deg, var(--brand-50), #fff)',
          border: '1px solid var(--ink-200)',
          color: 'var(--brand-600)',
          mb: 2.5,
          fontSize: 32,
        }}
      >
        {icon ?? '◇'}
      </Box>
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button variant="contained" onClick={onAction} sx={{ mt: 3 }}>
          {actionLabel}
        </Button>
      )}
    </Box>
  )
}
