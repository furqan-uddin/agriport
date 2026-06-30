import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom'
import { Box, Typography, Button, Divider } from '@mui/material'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded'
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded'
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded'
import WarehouseRoundedIcon from '@mui/icons-material/WarehouseRounded'
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded'
import PageHeader from '@/components/common/PageHeader'
import StatusChip from '@/components/common/StatusChip'
import ProductThumb from '@/components/common/ProductThumb'
import { OrderDetailSkeleton } from '@/components/common/Loader'
import EmptyState from '@/components/common/EmptyState'
import { useGetOrderQuery, useGetProductsQuery } from '@/redux/api'
import { useAppDispatch } from '@/redux/hooks'
import { addToCart } from '@/redux/slices/cartSlice'
import { ROUTES, PAYMENT_MODE_LABEL } from '@/constants'
import { formatDate } from '@/utils/format'
import { downloadInvoice, downloadGatePass } from '@/utils/documents'
import toast from 'react-hot-toast'

function Timeline({ steps }: { steps: { label: string; at: string | null; done: boolean }[] }) {
  return (
    <Box sx={{ position: 'relative', pl: 1 }}>
      {steps.map((s, i) => {
        const last = i === steps.length - 1
        return (
          <Box key={i} sx={{ display: 'flex', gap: 2, pb: last ? 0 : 3, position: 'relative' }}>
            {!last && (
              <Box sx={{ position: 'absolute', left: 9, top: 22, bottom: 0, width: 2, bgcolor: s.done ? 'var(--brand-400)' : 'var(--ink-200)' }} />
            )}
            <Box
              sx={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                flexShrink: 0,
                zIndex: 1,
                border: `2px solid ${s.done ? 'var(--brand-500)' : 'var(--ink-300)'}`,
                bgcolor: s.done ? 'var(--brand-500)' : '#fff',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {s.done && <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#fff' }} />}
            </Box>
            <Box sx={{ mt: -0.25 }}>
              <Typography sx={{ fontWeight: s.done ? 700 : 500, fontSize: 14.5, color: s.done ? 'var(--ink-900)' : 'var(--ink-500)' }}>
                {s.label}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'var(--ink-400)' }} className="tnum">
                {s.at ? formatDate(s.at, true) : 'Pending'}
              </Typography>
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}

export default function OrderDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { data: order, isLoading } = useGetOrderQuery(id)
  const { data: products } = useGetProductsQuery()

  if (isLoading) return <OrderDetailSkeleton />
  if (!order)
    return <EmptyState title="Order not found" actionLabel="Back to orders" onAction={() => navigate(ROUTES.orders)} />

  const hasDocs = order.status === 'confirmed' || order.status === 'completed'

  const reorder = () => {
    order.lines.forEach((l) => {
      const product = products?.find((p) => p.id === l.productId)
      if (product) dispatch(addToCart({ product, quantity: l.quantity }))
    })
    toast.success('Items added to cart')
    navigate(ROUTES.cart)
  }

  return (
    <Box className="animate-fade-up">
      <PageHeader
        title={order.reference}
        crumbs={[{ label: 'Home', to: ROUTES.home }, { label: 'Orders', to: ROUTES.orders }, { label: order.reference }]}
        action={
          <Box className="flex items-center gap-2">
            <StatusChip kind="order" value={order.status} size="medium" />
            <StatusChip kind="payment" value={order.paymentStatus} size="medium" />
          </Box>
        }
      />

      <Box className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: items + meta */}
        <Box className="lg:col-span-2 flex flex-col gap-6">
          <Box sx={{ borderRadius: 4, border: '1px solid var(--ink-200)', bgcolor: '#fff', p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" sx={{ fontSize: 17, mb: 2 }}>
              Items ({order.lines.length})
            </Typography>
            <Box className="flex flex-col gap-3">
              {order.lines.map((l) => (
                <Box key={l.productId} className="flex items-center gap-3">
                  <Box sx={{ width: 60, height: 60, flexShrink: 0 }}>
                    <ProductThumb id={l.productId} name={l.name} imageUrl={l.image || undefined} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      component={RouterLink}
                      to={ROUTES.productDetail(l.productId)}
                      sx={{ fontWeight: 600, fontSize: 14.5, color: 'var(--ink-900)', textDecoration: 'none' }}
                    >
                      {l.name}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: 'var(--ink-500)' }} className="tnum">
                      Quantity: {l.quantity} {l.unit}
                    </Typography>
                    {l.specifications && Object.keys(l.specifications).length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                        {Object.entries(l.specifications).map(([k, v]) => (
                          <Typography
                            key={k}
                            sx={{
                              fontSize: 11,
                              bgcolor: 'var(--ink-100)',
                              color: 'var(--ink-700)',
                              px: 1,
                              py: 0.25,
                              borderRadius: 1,
                              textTransform: 'capitalize',
                            }}
                          >
                            <strong>{k}:</strong> {v}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
            <Divider sx={{ my: 2.5 }} />
            <Box sx={{ ml: 'auto', maxWidth: 350 }}>
              <Typography sx={{ fontSize: 13, color: 'var(--ink-500)', lineHeight: 1.5 }}>
                This is a wholesale B2B enquiry. Our team is processing your request and will contact you with product verification and logistics details.
              </Typography>
            </Box>
          </Box>

          {/* Logistics / cancellation */}
          {order.status === 'cancelled' ? (
            <Box sx={{ borderRadius: 4, border: '1px solid #E0695C', bgcolor: '#FDF3F2', p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" sx={{ fontSize: 16, mb: 1, color: '#922A20' }}>
                Cancellation details
              </Typography>
              <Typography sx={{ fontSize: 14, mb: 0.5 }}>
                <strong>Reason:</strong> {order.cancellationReason}
              </Typography>
              <Typography sx={{ fontSize: 14, color: 'var(--ink-600)' }}>
                <strong>Refund:</strong> {order.refundStatus}
              </Typography>
            </Box>
          ) : (
            (order.pickupAddress || order.dispatchInfo) && (
              <Box sx={{ borderRadius: 4, border: '1px solid var(--ink-200)', bgcolor: '#fff', p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" sx={{ fontSize: 17, mb: 2 }}>
                  Logistics
                </Typography>
                {order.pickupAddress && (
                  <Box className="flex items-start gap-2 mb-3">
                    <WarehouseRoundedIcon sx={{ color: 'var(--brand-600)', fontSize: 20, mt: 0.25 }} />
                    <Box>
                      <Typography sx={{ fontSize: 12.5, color: 'var(--ink-500)', fontWeight: 600 }}>PICKUP ADDRESS</Typography>
                      <Typography sx={{ fontSize: 14 }}>{order.pickupAddress}</Typography>
                    </Box>
                  </Box>
                )}
                {order.dispatchInfo && (
                  <Box className="flex items-start gap-2">
                    <LocalShippingRoundedIcon sx={{ color: 'var(--brand-600)', fontSize: 20, mt: 0.25 }} />
                    <Box>
                      <Typography sx={{ fontSize: 12.5, color: 'var(--ink-500)', fontWeight: 600 }}>DISPATCH</Typography>
                      <Typography sx={{ fontSize: 14 }}>{order.dispatchInfo}</Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            )
          )}
        </Box>

        {/* Right: tracking + actions */}
        <Box className="flex flex-col gap-6">
          <Box sx={{ borderRadius: 4, border: '1px solid var(--ink-200)', bgcolor: '#fff', p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" sx={{ fontSize: 17, mb: 2.5 }}>
              Order tracking
            </Typography>
            <Timeline steps={order.trackingTimeline} />
          </Box>

          <Box sx={{ borderRadius: 4, border: '1px solid var(--ink-200)', bgcolor: '#fff', p: { xs: 2, md: 3 } }}>
            <Typography sx={{ fontSize: 12.5, color: 'var(--ink-500)', fontWeight: 600, mb: 1.5 }}>
              PAYMENT · {PAYMENT_MODE_LABEL[order.paymentMode]}
            </Typography>
            <Box className="flex flex-col gap-2">
              {hasDocs && (
                <>
                  <Button variant="outlined" startIcon={<DescriptionRoundedIcon />} onClick={() => downloadInvoice(order)} fullWidth>
                    Download invoice
                  </Button>
                  <Button variant="outlined" startIcon={<BadgeRoundedIcon />} onClick={() => downloadGatePass(order)} fullWidth>
                    Download gate pass
                  </Button>
                </>
              )}
              {order.status === 'completed' && (
                <Button variant="contained" startIcon={<ReplayRoundedIcon />} onClick={reorder} fullWidth>
                  Reorder
                </Button>
              )}
              {order.status === 'placed' && (
                <Button variant="outlined" startIcon={<DownloadRoundedIcon />} disabled fullWidth>
                  Documents on confirmation
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
