import { Box, Typography } from '@mui/material'
import type { ReactNode } from 'react'

interface Props {
  title?: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  padded?: boolean
}

export default function SectionCard({ title, subtitle, action, children, padded = true }: Props) {
  return (
    <Box sx={{ borderRadius: 4, border: '1px solid var(--ink-200)', bgcolor: '#fff', p: padded ? 3 : 0, overflow: 'hidden' }}>
      {(title || action) && (
        <Box className="flex items-start justify-between" sx={{ mb: subtitle ? 2 : 2, ...(padded ? {} : { p: 3, pb: 0 }) }}>
          <Box>
            {title && <Typography sx={{ fontWeight: 700, fontSize: 16 }}>{title}</Typography>}
            {subtitle && <Typography sx={{ fontSize: 12.5, color: 'var(--ink-500)' }}>{subtitle}</Typography>}
          </Box>
          {action}
        </Box>
      )}
      {children}
    </Box>
  )
}
