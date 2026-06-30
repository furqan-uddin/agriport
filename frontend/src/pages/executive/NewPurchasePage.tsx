import { Box } from '@mui/material'
import SellProductForm from '@/components/sales/SellProductForm'

export default function NewPurchasePage() {
  return (
    <Box>
      <SellProductForm formMode="purchase" />
    </Box>
  )
}
