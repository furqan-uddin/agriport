import { Box, Typography, Button, IconButton } from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import PageHeader from '@/components/common/PageHeader'
import ProductThumb from '@/components/common/ProductThumb'
import QuantityStepper from '@/components/common/QuantityStepper'
import EmptyState from '@/components/common/EmptyState'
import OrderSummary from '@/components/order/OrderSummary'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { setQuantity, removeFromCart } from '@/redux/slices/cartSlice'
import { useGetProductsQuery } from '@/redux/api'
import { ROUTES } from '@/constants'

export default function CartPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const items = useAppSelector((s) => s.cart.items)
  const { data: products } = useGetProductsQuery()

  if (items.length === 0) {
    return (
      <Box className="animate-fade-up">
        <PageHeader title="Your cart" crumbs={[{ label: 'Home', to: ROUTES.home }, { label: 'Cart' }]} />
        <Box sx={{ border: '1px solid var(--ink-200)', borderRadius: 4, bgcolor: '#fff' }}>
          <EmptyState
            icon={<ShoppingCartRoundedIcon fontSize="inherit" />}
            title="Your cart is empty"
            description="Browse the marketplace and add products to start a wholesale order."
            actionLabel="Browse marketplace"
            onAction={() => navigate(ROUTES.products)}
          />
        </Box>
      </Box>
    )
  }

  return (
    <Box className="animate-fade-up">
      <PageHeader
        title="Your Enquiry List"
        subtitle={`${items.length} ${items.length === 1 ? 'product' : 'products'} added to your enquiry list`}
        crumbs={[{ label: 'Home', to: ROUTES.home }, { label: 'Cart' }]}
      />

      <Box className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Box className="lg:col-span-2 flex flex-col gap-3">
          {items.map((item) => {
            const product = products?.find((p) => p.id === item.productId)
            return (
              <Box
                key={item.productId}
                sx={{
                  display: 'flex',
                  gap: 2,
                  p: 2,
                  borderRadius: 3,
                  border: '1px solid var(--ink-200)',
                  bgcolor: '#fff',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  flexDirection: { xs: 'column', sm: 'row' },
                }}
              >
                <Box
                  component={RouterLink}
                  to={ROUTES.productDetail(item.productId)}
                  sx={{ width: { xs: '100%', sm: 96 }, height: 96, flexShrink: 0 }}
                >
                  <ProductThumb id={item.productId} name={item.name} imageUrl={item.image} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    component={RouterLink}
                    to={ROUTES.productDetail(item.productId)}
                    sx={{ fontWeight: 600, fontSize: 15, color: 'var(--ink-900)', textDecoration: 'none', display: 'block', mb: 0.5 }}
                  >
                    {item.name}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: 'var(--ink-500)' }} className="tnum">
                    MOQ {item.moq}
                  </Typography>
                  <Box className="flex items-center gap-3 mt-2.5">
                    <QuantityStepper
                      size="small"
                      value={item.quantity}
                      min={item.moq}
                      max={product?.availableStock}
                      onChange={(q) =>
                        dispatch(setQuantity({ productId: item.productId, quantity: q, slabs: product?.pricingSlabs }))
                      }
                    />
                    <IconButton size="small" onClick={() => dispatch(removeFromCart(item.productId))} sx={{ color: 'var(--ink-500)' }}>
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            )
          })}
          <Button component={RouterLink} to={ROUTES.products} sx={{ alignSelf: 'flex-start', mt: 1 }}>
            ← Continue shopping
          </Button>
        </Box>

        <Box>
          <OrderSummary items={items} />
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<LockRoundedIcon />}
            sx={{ mt: 2 }}
            onClick={() => navigate(ROUTES.checkout)}
          >
            Proceed to submit enquiry
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
