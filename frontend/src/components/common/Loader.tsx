import { Box, CircularProgress, Skeleton } from '@mui/material'

export function Loader({ height = 240 }: { height?: number | string }) {
  return (
    <Box sx={{ height, display: 'grid', placeItems: 'center' }}>
      <CircularProgress size={28} thickness={4} />
    </Box>
  )
}

/** Skeleton grid used while product lists load. */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <Box key={i} sx={{ border: '1px solid var(--ink-200)', borderRadius: { xs: 2, md: 3.5 }, overflow: 'hidden', bgcolor: '#fff' }}>
          <Box sx={{ p: { xs: 1, md: 1.75 }, pb: 0 }}>
            <Skeleton variant="rectangular" sx={{ height: { xs: 85, md: 180 }, borderRadius: { xs: 1.25, md: 2.5 } }} />
          </Box>
          <Box sx={{ p: { xs: 0.75, md: 2 }, pt: { xs: 0.5, md: 1.5 } }}>
            <Skeleton width="35%" height={20} sx={{ mb: 0.5 }} />
            <Skeleton width="85%" height={18} />
            <Skeleton width="65%" height={18} />
            <Skeleton width="50%" height={26} sx={{ mt: 1 }} />
          </Box>
        </Box>
      ))}
    </div>
  )
}

/** Skeleton for the Orders list page — mimics OrderRow layout. */
export function OrderListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <Box className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: { xs: 2, sm: 2.5 },
            borderRadius: 3,
            border: '1px solid var(--ink-200)',
            bgcolor: '#fff',
          }}
        >
          {/* Icon box */}
          <Skeleton variant="rounded" width={46} height={46} sx={{ borderRadius: 2, flexShrink: 0 }} />
          {/* Reference + meta */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box className="flex items-center gap-2" sx={{ mb: 0.75 }}>
              <Skeleton width={130} height={20} />
              <Skeleton width={72} height={22} sx={{ borderRadius: 3 }} />
            </Box>
            <Skeleton width="55%" height={16} />
          </Box>
          {/* Amount */}
          <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
            <Skeleton width={80} height={24} sx={{ ml: 'auto', mb: 0.5 }} />
            <Skeleton width={60} height={20} sx={{ ml: 'auto', borderRadius: 3 }} />
          </Box>
          {/* Chevron */}
          <Skeleton variant="circular" width={24} height={24} />
        </Box>
      ))}
    </Box>
  )
}

/** Skeleton for Order Detail page — mimics the 2-col layout. */
export function OrderDetailSkeleton() {
  return (
    <Box className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left col */}
      <Box className="lg:col-span-2 flex flex-col gap-6">
        <Box sx={{ borderRadius: 4, border: '1px solid var(--ink-200)', bgcolor: '#fff', p: { xs: 2, md: 3 } }}>
          <Skeleton width={120} height={26} sx={{ mb: 2 }} />
          {[1, 2, 3].map((i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
              <Skeleton variant="rounded" width={60} height={60} sx={{ borderRadius: 2, flexShrink: 0 }} />
              <Box sx={{ flex: 1 }}>
                <Skeleton width="70%" height={20} sx={{ mb: 0.5 }} />
                <Skeleton width="40%" height={16} />
              </Box>
              <Skeleton width={70} height={20} />
            </Box>
          ))}
          <Skeleton width="100%" height={1} sx={{ my: 2 }} />
          <Box sx={{ ml: 'auto', maxWidth: 320 }}>
            {[1, 2, 3].map((i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Skeleton width={80} height={18} />
                <Skeleton width={60} height={18} />
              </Box>
            ))}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Skeleton width={50} height={22} />
              <Skeleton width={90} height={28} />
            </Box>
          </Box>
        </Box>
      </Box>
      {/* Right col */}
      <Box className="flex flex-col gap-6">
        <Box sx={{ borderRadius: 4, border: '1px solid var(--ink-200)', bgcolor: '#fff', p: { xs: 2, md: 3 } }}>
          <Skeleton width={130} height={24} sx={{ mb: 2.5 }} />
          {[1, 2, 3].map((i) => (
            <Box key={i} sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Skeleton variant="circular" width={20} height={20} />
              <Box>
                <Skeleton width={100} height={18} sx={{ mb: 0.5 }} />
                <Skeleton width={70} height={14} />
              </Box>
            </Box>
          ))}
        </Box>
        <Box sx={{ borderRadius: 4, border: '1px solid var(--ink-200)', bgcolor: '#fff', p: { xs: 2, md: 3 } }}>
          <Skeleton width={100} height={18} sx={{ mb: 1.5 }} />
          <Skeleton variant="rounded" width="100%" height={40} sx={{ borderRadius: 2, mb: 1.5 }} />
          <Skeleton variant="rounded" width="100%" height={40} sx={{ borderRadius: 2 }} />
        </Box>
      </Box>
    </Box>
  )
}

/** Skeleton for Product Detail page — mimics gallery + info layout. */
export function ProductDetailSkeleton() {
  return (
    <Box className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left: image gallery */}
      <Box>
        <Skeleton variant="rounded" width="100%" sx={{ aspectRatio: '4/3', borderRadius: 4, mb: 2 }} />
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" width={72} height={72} sx={{ borderRadius: 2, flexShrink: 0 }} />
          ))}
        </Box>
      </Box>
      {/* Right: product info */}
      <Box>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Skeleton width={80} height={24} sx={{ borderRadius: 3 }} />
          <Skeleton width={110} height={24} sx={{ borderRadius: 3 }} />
        </Box>
        <Skeleton width="90%" height={34} sx={{ mb: 0.5 }} />
        <Skeleton width="70%" height={34} sx={{ mb: 2 }} />
        <Skeleton width="45%" height={20} sx={{ mb: 3 }} />
        <Skeleton width="100%" height={1} sx={{ mb: 2 }} />
        <Skeleton width="40%" height={18} sx={{ mb: 1 }} />
        {[1, 2, 3].map((i) => (
          <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Skeleton width={80} height={16} />
            <Skeleton width={60} height={16} />
          </Box>
        ))}
        <Skeleton width="100%" height={1} sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Skeleton variant="rounded" width={140} height={44} sx={{ borderRadius: 2.5 }} />
          <Skeleton variant="rounded" width={140} height={44} sx={{ borderRadius: 2.5 }} />
        </Box>
      </Box>
    </Box>
  )
}

/** Skeleton for Profile page — Documents tab. */
export function DocListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Box className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2,
            borderRadius: 3,
            border: '1px solid var(--ink-200)',
            bgcolor: '#fff',
            flexWrap: 'wrap',
          }}
        >
          <Skeleton variant="rounded" width={42} height={42} sx={{ borderRadius: 2, flexShrink: 0 }} />
          <Box sx={{ flex: 1, minWidth: 160 }}>
            <Skeleton width="55%" height={20} sx={{ mb: 0.5 }} />
            <Skeleton width="70%" height={16} />
          </Box>
          <Skeleton width={70} height={24} sx={{ borderRadius: 3 }} />
          <Skeleton variant="rounded" width={90} height={36} sx={{ borderRadius: 2 }} />
        </Box>
      ))}
    </Box>
  )
}

/** Skeleton for Profile page — Transactions tab. */
export function TransactionListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <Box className="flex flex-col">
      {/* Header row */}
      <Box sx={{ display: { xs: 'none', sm: 'grid' }, gridTemplateColumns: '1.4fr 1fr 1fr 1fr', px: 2, pb: 1.5 }}>
        {[100, 60, 80, 60].map((w, i) => (
          <Skeleton key={i} width={w} height={16} />
        ))}
      </Box>
      {Array.from({ length: count }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', sm: '1.4fr 1fr 1fr 1fr' },
            alignItems: 'center',
            gap: 1,
            p: 2,
            borderTop: '1px solid var(--ink-100)',
          }}
        >
          <Box>
            <Skeleton width={110} height={20} sx={{ mb: 0.5 }} />
            <Skeleton width={80} height={15} />
          </Box>
          <Skeleton width={70} height={20} />
          <Skeleton width={90} height={20} sx={{ display: { xs: 'none', sm: 'block' } }} />
          <Skeleton width={65} height={22} sx={{ borderRadius: 3 }} />
        </Box>
      ))}
    </Box>
  )
}
