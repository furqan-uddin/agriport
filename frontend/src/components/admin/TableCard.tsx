import { Box, Typography, InputBase } from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import type { ReactNode } from 'react'

interface Props {
  title?: string
  count?: number
  search?: string
  onSearch?: (v: string) => void
  searchPlaceholder?: string
  actions?: ReactNode
  height?: number
  children: ReactNode
}

export default function TableCard({
  title,
  count,
  search,
  onSearch,
  searchPlaceholder = 'Search…',
  actions,
  height = 560,
  children,
}: Props) {
  return (
    <Box sx={{ borderRadius: 4, border: '1px solid var(--ink-200)', bgcolor: '#fff', overflow: 'hidden' }}>
      {(title || onSearch || actions) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
            px: 2.5,
            py: 2,
            borderBottom: '1px solid var(--ink-200)',
          }}
        >
          {title && (
            <Box className="flex items-center gap-2">
              <Typography sx={{ fontWeight: 700, fontSize: 16 }}>{title}</Typography>
              {typeof count === 'number' && (
                <Box
                  className="tnum"
                  sx={{ px: 1, py: 0.25, borderRadius: 1.5, bgcolor: 'var(--ink-100)', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-600)' }}
                >
                  {count}
                </Box>
              )}
            </Box>
          )}
          <Box sx={{ flex: 1 }} />
          {onSearch && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 1.5,
                height: 40,
                width: { xs: '100%', sm: 260 },
                borderRadius: 2.5,
                border: '1px solid var(--ink-200)',
                bgcolor: 'var(--ink-50)',
                '&:focus-within': { borderColor: 'var(--brand-500)', bgcolor: '#fff' },
              }}
            >
              <SearchRoundedIcon sx={{ fontSize: 19, color: 'var(--ink-500)' }} />
              <InputBase
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                placeholder={searchPlaceholder}
                sx={{ ml: 1, flex: 1, fontSize: 14 }}
              />
            </Box>
          )}
          {actions}
        </Box>
      )}
      <Box sx={{ height }}>{children}</Box>
    </Box>
  )
}
