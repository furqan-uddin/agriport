import { Box, Typography, Breadcrumbs, Link as MuiLink } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded'
import type { ReactNode } from 'react'

interface Crumb {
  label: string
  to?: string
}

interface Props {
  title: string
  subtitle?: string
  crumbs?: Crumb[]
  action?: ReactNode
}

export default function PageHeader({ title, subtitle, crumbs, action }: Props) {
  return (
    <Box className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <Box>
        {crumbs && crumbs.length > 0 && (
          <Breadcrumbs
            separator={<NavigateNextRoundedIcon sx={{ fontSize: 15 }} />}
            sx={{ mb: 1, '& .MuiBreadcrumbs-li': { fontSize: 13 } }}
          >
            {crumbs.map((c, i) =>
              c.to ? (
                <MuiLink
                  key={i}
                  component={RouterLink}
                  to={c.to}
                  underline="hover"
                  color="text.secondary"
                  sx={{ fontSize: 13, fontWeight: 500 }}
                >
                  {c.label}
                </MuiLink>
              ) : (
                <Typography key={i} sx={{ fontSize: 13, fontWeight: 600 }} color="text.primary">
                  {c.label}
                </Typography>
              ),
            )}
          </Breadcrumbs>
        )}
        {title && (
          <Typography variant="h4" sx={{ fontSize: { xs: 24, md: 30 } }}>
            {title}
          </Typography>
        )}
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 620 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && <Box className="flex items-center gap-2">{action}</Box>}
    </Box>
  )
}
