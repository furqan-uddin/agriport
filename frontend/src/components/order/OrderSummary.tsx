import { Box, Typography, Divider } from '@mui/material'
import type { CartItem } from '@/types'


export default function OrderSummary({ items, title = 'Enquiry summary' }: { items: CartItem[]; title?: string }) {
  return (
    <Box sx={{ borderRadius: 4, border: '1px solid var(--ink-200)', bgcolor: '#fff', p: { xs: 2.5, md: 3 } }}>
      <Typography variant="h6" sx={{ fontSize: 17, fontWeight: 700, mb: 2 }}>
        {title}
      </Typography>
      
      <Box className="flex flex-col gap-2.5">
        <Box className="flex items-center justify-between">
          <Typography sx={{ fontSize: 13.5, color: 'var(--ink-500)' }}>
            Total items
          </Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-800)' }}>
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </Typography>
        </Box>

        <Divider sx={{ my: 1 }} />
        
        <Typography sx={{ fontSize: 12.5, color: 'var(--ink-500)', lineHeight: 1.5 }}>
          This is a wholesale B2B enquiry. No payments are charged during checkout. Once submitted, our sales team will contact you with a customized quotation, shipping specifications, and a delivery schedule.
        </Typography>
      </Box>
    </Box>
  )
}

