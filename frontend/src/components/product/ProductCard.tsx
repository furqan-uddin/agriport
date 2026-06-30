import { Card, Box, Typography, Chip } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import BoltRoundedIcon from '@mui/icons-material/BoltRounded'
import ProductThumb from '@/components/common/ProductThumb'
import StatusChip from '@/components/common/StatusChip'
import { ROUTES } from '@/constants'
import type { Product } from '@/types'
import { formatMoney } from '@/utils/format'

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Card
      component={RouterLink}
      to={ROUTES.productDetail(product.id)}
      sx={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        overflow: 'hidden',
        borderRadius: { xs: 1.5, md: 3.5 },
        border: '1px solid var(--ink-200)',
        bgcolor: '#ffffff',
        boxShadow: '0 2px 8px rgba(22,27,36,0.03)',
      }}
    >
      <Box sx={{ p: { xs: 1, md: 1.75 }, pb: 0 }}>
        <Box
          sx={{
            position: 'relative',
            height: { xs: 85, md: 180 },
            borderRadius: { xs: 1.25, md: 2.5 },
            overflow: 'hidden',
            border: '1px solid var(--ink-200)',
          }}
        >
          <ProductThumb id={product.id} name={product.name} category={product.category} rounded={5} imageUrl={product.images?.[0] || undefined} />
          <Box sx={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 0.75 }}>
            {product.isNew && (
              <Chip
                size="small"
                icon={<BoltRoundedIcon sx={{ fontSize: 14 }} />}
                label="New"
                sx={{ bgcolor: 'rgba(255,255,255,0.92)', fontWeight: 700, backdropFilter: 'blur(4px)' }}
              />
            )}
          </Box>
        </Box>
      </Box>

      <Box sx={{ p: { xs: 0.75, md: 2 }, pt: { xs: 0.5, md: 1.5 } }}>
        <Box className="flex items-center justify-between gap-2 mb-0.5">
          <StatusChip kind="stock" value={product.stockStatus} />
        </Box>

        <Typography
          sx={{
            fontWeight: 600,
            fontSize: { xs: 12, md: 15 },
            lineHeight: 1.3,
            mb: { xs: 0.5, md: 1.5 },
            minHeight: { xs: 'auto', md: 40 },
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {product.name}
        </Typography>

        <Box sx={{ mt: { xs: 0.5, md: 1.5 } }}>
          <Box sx={{ mt: { xs: 0.5, md: 1 }, pt: { xs: 0.5, md: 1 }, borderTop: '1px dashed var(--ink-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontSize: { xs: 10, md: 11 }, color: 'var(--ink-500)', fontWeight: 600 }}>
              Origin & Grade
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: { xs: 11, md: 13.5 }, color: 'var(--brand-700)' }}>
              {product.origin} ({product.specifications?.Grade || 'Standard'})
            </Typography>
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, mt: 1, justifyContent: 'flex-end', alignItems: 'center', color: 'var(--brand-700)', gap: 0.25 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 750, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Explore
            </Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 800, lineHeight: 1 }}>→</Typography>
          </Box>
        </Box>
      </Box>
    </Card>
  )
}
