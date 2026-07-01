import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  Divider,
  CircularProgress,
} from '@mui/material'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded'
import PageHeader from '@/components/common/PageHeader'
import OrderSummary from '@/components/order/OrderSummary'
import EmptyState from '@/components/common/EmptyState'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { clearCart } from '@/redux/slices/cartSlice'
import { ROUTES } from '@/constants'
import { useCreateOrderMutation } from '@/redux/api'
import toast from 'react-hot-toast'

export default function CheckoutPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const items = useAppSelector((s) => s.cart.items)
  const user = useAppSelector((s) => s.auth.user)
  const [createOrder, { isLoading: placing }] = useCreateOrderMutation()

  if (items.length === 0) {
    return (
      <EmptyState title="Nothing to check out" actionLabel="Browse marketplace" onAction={() => navigate(ROUTES.products)} />
    )
  }

  const placeOrder = async () => {
    try {
      const orderPayload = {
        lines: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          specifications: item.specifications,
          variantSize: item.specifications?.['Specific Size'] || '',
          variantPackingType: item.specifications?.['Packing Type'] || 'Cartoon',
        })),
        paymentMode: 'offline',
        deliveryAddress: user?.address || 'Pickup from Agriport Warehouse',
      }

      await createOrder(orderPayload).unwrap()
      dispatch(clearCart())
      window.dispatchEvent(new Event('cart-updated'))
      toast.success('Enquiry submitted successfully!')
      navigate(`${ROUTES.orders}?placed=1`, { replace: true })
    } catch (err: any) {
      toast.error(err.data?.message || 'Failed to submit enquiry')
    }
  }

  return (
    <Box className="animate-fade-up">
      <PageHeader
        title="Submit Enquiry"
        crumbs={[{ label: 'Home', to: ROUTES.home }, { label: 'Cart', to: ROUTES.cart }, { label: 'Submit Enquiry' }]}
      />

      <Box sx={{ maxWidth: 640, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <OrderSummary items={items} />
        <Box>
          <Button
            variant="contained"
            size="large"
            fullWidth
            disabled={placing}
            startIcon={placing ? <CircularProgress size={18} color="inherit" /> : <CheckCircleRoundedIcon />}
            onClick={placeOrder}
          >
            {placing ? 'Submitting enquiry…' : 'Submit Enquiry'}
          </Button>
          <Divider sx={{ my: 2 }} />
          <Box className="flex items-start gap-2">
            <ShieldRoundedIcon sx={{ fontSize: 18, color: 'var(--brand-600)', mt: 0.25 }} />
            <Typography sx={{ fontSize: 12.5, color: 'var(--ink-500)' }}>
              Your enquiry is secure. Customized quotation, invoice, and gate pass will be generated once the order is confirmed by our sales team.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
