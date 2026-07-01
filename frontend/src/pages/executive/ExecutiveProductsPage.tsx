import { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Divider,
  Paper,
  Slide,
  Backdrop,
} from '@mui/material'
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import { useGetProductsQuery } from '@/redux/api'
import type { Product } from '@/types'

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box className="flex justify-between items-start" sx={{ py: 1 }}>
      <Typography sx={{ fontSize: 13, color: 'var(--ink-500)', minWidth: 120 }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 600, textAlign: 'right', flex: 1 }}>{value}</Typography>
    </Box>
  )
}

export default function ExecutiveProductsPage() {
  const { data: serverProducts, isLoading } = useGetProductsQuery({ isExecutive: true })
  const [search, setSearch] = useState('')
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const list = serverProducts || []
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.origin.toLowerCase().includes(q),
    )
  }, [serverProducts, search])

  return (
    <Box className="flex flex-col gap-5">
      {/* Header bar */}
      <Box className="flex items-center justify-between flex-wrap gap-3">
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 20 }}>Product Catalogue</Typography>
          <Typography sx={{ fontSize: 13, color: 'var(--ink-500)' }}>
            {filtered.length} products · view specifications
          </Typography>
        </Box>
      </Box>

      {/* Search */}
      <TextField
        size="small"
        placeholder="Search by name, category or origin…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ maxWidth: 420, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
      />

      {/* Table */}
      <Box sx={{ borderRadius: 3, border: '1px solid var(--ink-200)', overflow: 'hidden', bgcolor: '#fff' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'var(--ink-50)', '& th': { fontWeight: 700, fontSize: 12, color: 'var(--ink-600)', letterSpacing: '0.04em', textTransform: 'uppercase', borderColor: 'var(--ink-200)' } }}>
              <TableCell>Product Name</TableCell>
              <TableCell>Brand</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Origin</TableCell>
              <TableCell>Grade</TableCell>
              <TableCell>Packaging & Sizes</TableCell>
              <TableCell>Available Stock</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'var(--ink-400)' }}>
                  <InventoryRoundedIcon sx={{ fontSize: 36, mb: 1, display: 'block', mx: 'auto', opacity: 0.4 }} />
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow
                  key={p.id}
                  onClick={() => setDetailProduct(p)}
                  sx={{ cursor: 'pointer', '& td': { borderColor: 'var(--ink-100)', py: 1.5 }, '&:hover': { bgcolor: 'var(--ink-50)' } }}
                >
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.3 }}>{p.name}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, color: 'var(--ink-600)' }}>{p.brand || '—'}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{p.category}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{p.origin}</TableCell>
                  <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{p.specifications?.Grade || 'Premium'}</TableCell>
                  <TableCell sx={{ fontSize: 13, color: 'var(--ink-600)' }}>
                    {p.sizeVariants && p.sizeVariants.length > 0
                      ? p.sizeVariants.map(v => `${v.size} (${v.packingType || 'Cartoon'})`).join(', ')
                      : p.specifications?.['Size or Count'] || '—'}
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-700)' }}>
                    {p.availableStock?.toLocaleString('en-IN')} cartons
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Box>

      {/* Backdrop */}
      <Backdrop
        open={!!detailProduct}
        onClick={() => setDetailProduct(null)}
        sx={{ zIndex: 1200, bgcolor: 'rgba(0,0,0,0.15)' }}
      />

      {/* Product Detail Floating Card */}
      <Slide direction="left" in={!!detailProduct} mountOnEnter unmountOnExit>
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 24,
            width: 400,
            maxHeight: '70vh',
            zIndex: 1300,
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
          }}
        >
          {detailProduct && (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '70vh' }}>
              {/* Header */}
              <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--ink-100)' }}>
                <Box sx={{ flex: 1, pr: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14, lineHeight: 1.4 }}>{detailProduct.name}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: 'var(--ink-500)', mt: 0.25 }}>{detailProduct.category}</Typography>
                </Box>
                <IconButton size="small" onClick={() => setDetailProduct(null)}>
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </Box>

              {/* Body */}
              <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-400)', letterSpacing: '0.06em', mb: 0.5 }}>Product Specifications</Typography>
                  <DetailRow label="Product Name" value={detailProduct.name} />
                  {detailProduct.brand && <DetailRow label="Brand" value={detailProduct.brand} />}
                  <DetailRow label="Category" value={detailProduct.category} />
                  <DetailRow label="Origin" value={detailProduct.origin} />
                  <DetailRow label="Grade" value={detailProduct.specifications?.Grade || 'Premium'} />
                  <DetailRow label="Packing Type" value={detailProduct.specifications?.['Packing Type'] || 'Cartoon'} />
                  <DetailRow label="Sizes" value={detailProduct.sizeVariants && detailProduct.sizeVariants.length > 0 ? detailProduct.sizeVariants.map(v => `${v.size} (${v.packingType || 'Cartoon'})`).join(', ') : detailProduct.specifications?.['Size or Count'] || '—'} />
                  <DetailRow label="Available Stock" value={`${detailProduct.availableStock?.toLocaleString('en-IN')} cartons`} />
                </Box>
              </Box>
            </Box>
          )}
        </Paper>
      </Slide>
    </Box>
  )
}
