import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  TextField,
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
  const [address, setAddress] = useState('')
  const [createOrder, { isLoading: placing }] = useCreateOrderMutation()

  useEffect(() => {
    if (user?.address) {
      setAddress(user.address)
    }
  }, [user])

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
        deliveryAddress: address || user?.address || '',
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

      <Box className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Box className="lg:col-span-2 flex flex-col gap-6">
          {/* Delivery */}
          <Box sx={{ borderRadius: 4, border: '1px solid var(--ink-200)', bgcolor: '#fff', p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" sx={{ fontSize: 17, mb: 2 }}>
              Billing & pickup
            </Typography>
            <Box className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <TextField label="Business name" value={user?.companyName ?? ''} size="small" slotProps={{ input: { readOnly: true } }} />
              <TextField label="GST number" value={user?.gstNumber ?? ''} size="small" slotProps={{ input: { readOnly: true } }} />
            </Box>
            <TextField
              label="Delivery address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
          </Box>
        </Box>

        <Box>
          <OrderSummary items={items} />
          <Button
            variant="contained"
            size="large"
            fullWidth
            sx={{ mt: 2 }}
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
