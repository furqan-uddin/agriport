import { Box, Typography, Skeleton } from '@mui/material'
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded'
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded'
import type { ReactNode } from 'react'

interface Props {
  label: string
  value: string
  delta?: number
  hint?: string
  icon: ReactNode
  loading?: boolean
}

export default function StatCard({ label, value, delta, hint, icon, loading }: Props) {
  const positive = (delta ?? 0) >= 0
  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 4,
        border: '1px solid var(--ink-200)',
        bgcolor: '#fff',
        position: 'relative',
        overflow: 'hidden',
        transition: 'box-shadow .15s',
        '&:hover': { boxShadow: '0 6px 16px rgba(22,27,36,0.07)' },
      }}
    >
      <Box className="flex items-start justify-between mb-3">
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 2.5,
            display: 'grid',
            placeItems: 'center',
            background: 'linear-gradient(145deg, var(--brand-50), #fff)',
            border: '1px solid var(--ink-200)',
            color: 'var(--brand-600)',
            '& svg': { fontSize: 22 },
          }}
        >
          {icon}
        </Box>
        {typeof delta === 'number' && !loading && (
          <Box
            className="flex items-center gap-0.5"
            sx={{
              px: 0.75,
              py: 0.25,
              borderRadius: 1.5,
              bgcolor: positive ? 'rgba(28,124,88,0.1)' : 'rgba(192,57,43,0.1)',
              color: positive ? 'var(--brand-700)' : '#922A20',
            }}
          >
            {positive ? <ArrowUpwardRoundedIcon sx={{ fontSize: 14 }} /> : <ArrowDownwardRoundedIcon sx={{ fontSize: 14 }} />}
            <Typography className="tnum" sx={{ fontSize: 12.5, fontWeight: 700 }}>
              {Math.abs(delta)}%
            </Typography>
          </Box>
        )}
      </Box>
      <Typography sx={{ fontSize: 12.5, color: 'var(--ink-500)', fontWeight: 600, letterSpacing: '0.02em' }}>
        {label}
      </Typography>
      {loading ? (
        <Skeleton width="60%" height={36} />
      ) : (
        <Typography
          className="tnum"
          sx={{ fontFamily: '"Bricolage Grotesque", serif', fontWeight: 800, fontSize: 27, lineHeight: 1.15, mt: 0.25 }}
        >
          {value}
        </Typography>
      )}
      {hint && (
        <Typography sx={{ fontSize: 12, color: 'var(--ink-400)', mt: 0.25 }}>{hint}</Typography>
      )}
    </Box>
  )
}
