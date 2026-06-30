import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TextField,
  MenuItem,
} from '@mui/material'
import BoltRoundedIcon from '@mui/icons-material/BoltRounded'
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded'
import PublicRoundedIcon from '@mui/icons-material/PublicRounded'
import { useGetProductQuery } from '@/redux/api'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { trustIcon } from '@/utils/contentIcons'
import { addToCart } from '@/redux/slices/cartSlice'
import ProductThumb from '@/components/common/ProductThumb'
import StatusChip from '@/components/common/StatusChip'
import QuantityStepper from '@/components/common/QuantityStepper'
import PageHeader from '@/components/common/PageHeader'
import { ProductDetailSkeleton } from '@/components/common/Loader'
import EmptyState from '@/components/common/EmptyState'
import { formatMoney } from '@/utils/format'
import { ROUTES } from '@/constants'
import toast from 'react-hot-toast'

export default function ProductDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const trustBadges = useAppSelector((s) => s.storefront.trustBadges)
  const { data: product, isLoading } = useGetProductQuery(id)
  const [activeImg, setActiveImg] = useState(0)
  const [qty, setQty] = useState(1)
  const [packingType, setPackingType] = useState<string>('Cartoon')
  const [specificSize, setSpecificSize] = useState<string>('')
  const [containerOption, setContainerOption] = useState<string>('full')

  useEffect(() => {
    if (product?.specifications?.['Packing Type']) {
      setPackingType(product.specifications['Packing Type'])
    }
    if (product?.sizeVariants && product.sizeVariants.length > 0 && !specificSize) {
      setSpecificSize(product.sizeVariants[0].size)
    }
  }, [product, specificSize])

  if (isLoading) return <ProductDetailSkeleton />
  if (!product)
    return (
      <EmptyState title="Product not found" actionLabel="Back to marketplace" onAction={() => navigate(ROUTES.products)} />
    )

  // Initialise qty to MOQ on first resolve
  const effectiveQty = Math.max(qty, product.moq)
  const outOfStock = product.stockStatus === 'out_of_stock'
  const selectedVariant = product.sizeVariants?.find((v) => v.size === specificSize)

  const handleAdd = () => {
    const activePackingType = selectedVariant?.packingType || packingType
    const updatedProduct = {
      ...product,
      specifications: {
        ...product.specifications,
        'Packing Type': activePackingType,
        'Specific Size': specificSize || 'Not specified',
        'Container Option': containerOption === 'full' ? 'Full Container' : 'Half Container',
      },
    }
    dispatch(addToCart({ product: updatedProduct, quantity: effectiveQty }))
    toast.success(`Added to enquiry list! Redirecting to submit...`)
    navigate(ROUTES.cart)
  }

  return (
    <Box className="animate-fade-up">
      <PageHeader
        title=""
        crumbs={[
          { label: 'Home', to: ROUTES.home },
          { label: 'Marketplace', to: ROUTES.products },
          { label: product.category, to: `${ROUTES.products}?category=${encodeURIComponent(product.category)}` },
        ]}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: { xs: 3, md: 8 }, mt: { xs: -1.5, md: -2 } }}>
        {/* Gallery */}
        <Box>
          <Box sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid var(--ink-200)', height: { xs: 260, sm: 360, md: 420 } }}>
            <ProductThumb id={product.id} name={product.name} variant={activeImg} rounded={0} height="100%" fontSize={{ xs: '2.5rem', md: '4rem' }} imageUrl={product.images?.[activeImg] || undefined} />
          </Box>
          <Box sx={{ display: 'flex', gap: { xs: 1.5, md: 3 }, mt: { xs: 1.5, md: 3 } }}>
            {[0, 1, 2, 3].map((v) => (
              <Box
                key={v}
                onClick={() => setActiveImg(v)}
                sx={{
                  width: { xs: 60, sm: 76, md: 84 },
                  height: { xs: 60, sm: 76, md: 84 },
                  borderRadius: 2.5,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: activeImg === v ? '2px solid var(--brand-500)' : '2px solid transparent',
                  outline: '1px solid var(--ink-200)',
                }}
              >
                <ProductThumb id={product.id} name={product.name} variant={v} rounded={0} fontSize={{ xs: '0.85rem', md: '1.2rem' }} imageUrl={product.images?.[v] || undefined} />
              </Box>
            ))}
          </Box>
        </Box>

        {/* Info + buy box */}
        <Box>
          <Box className="flex flex-wrap items-center gap-2 mb-2">
            <StatusChip kind="stock" value={product.stockStatus} />
            {product.isNew && (
              <Chip size="small" icon={<BoltRoundedIcon sx={{ fontSize: 14 }} />} label="Upcoming arrivals" color="secondary" variant="outlined" />
            )}
            {product.tags?.map((t) => (
              <Chip key={t} size="small" label={t} variant="outlined" />
            ))}
          </Box>

          <Typography variant="h4" sx={{ fontSize: { xs: 24, md: 30 }, mb: 1 }}>
            {product.name}
          </Typography>

          <Box className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-3">
            <Box className="flex items-center gap-1.5 text-[13px]" sx={{ color: 'var(--ink-500)' }}>
              <PublicRoundedIcon sx={{ fontSize: 17 }} /> Origin: {product.origin}
            </Box>
            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
            <Box className="flex items-center gap-1.5 text-[13px]" sx={{ color: 'var(--ink-500)' }}>
              <LocalShippingRoundedIcon sx={{ fontSize: 17 }} /> Lead {product.leadTimeDays}d
            </Box>
          </Box>


          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {product.shortDescription}
          </Typography>

          {/* Specifications */}
          <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700 }}>
            Specifications
          </Typography>
          <Box sx={{ borderRadius: 3, border: '1px solid var(--ink-200)', overflow: 'hidden', bgcolor: '#fff', mb: 3.5 }}>
            <Table size="small">
              <TableBody>
                {Object.entries(product.specifications).map(([k, v]) => (
                  <TableRow key={k} sx={{ '& td': { borderColor: 'var(--ink-100)' } }}>
                    <TableCell sx={{ color: 'var(--ink-500)', fontWeight: 500 }}>{k}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {k === 'Packing Type' ? (
                        <select
                          value={packingType}
                          onChange={(e) => setPackingType(e.target.value)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--ink-200)',
                            fontFamily: 'inherit',
                            fontSize: '13.5px',
                            fontWeight: 600,
                            color: 'var(--ink-800)',
                            backgroundColor: '#fff',
                            cursor: 'pointer',
                            outline: 'none',
                          }}
                        >
                          <option value="Cartoon">Cartoon</option>
                          <option value="Basket">Basket</option>
                        </select>
                      ) : (
                        v
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          {/* Buy box */}
          <Box sx={{ borderRadius: 4, border: '1px solid var(--ink-200)', p: { xs: 2, md: 3 }, bgcolor: '#fff', boxShadow: '0 1px 3px rgba(22,27,36,0.05)' }}>
            <Box className="flex items-end justify-between mb-4 flex-wrap gap-3">
              <Box>
                <Typography sx={{ fontSize: 11.5, color: 'var(--ink-500)', fontWeight: 600, textTransform: 'uppercase' }}>size and count</Typography>
              </Box>
              <Box className="text-right">
                <Typography sx={{ fontSize: 11.5, color: 'var(--ink-500)', fontWeight: 600 }}>AVAILABLE</Typography>
                <Typography className="tnum" sx={{ fontWeight: 700, fontSize: { xs: 13, md: 15 } }}>
                  {product.availableStock.toLocaleString('en-IN')} {product.unit}
                </Typography>
              </Box>
            </Box>

            {/* Specific Size and Quantity */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: { xs: 2, md: 3 }, mb: 3 }}>
              <Box>
                <Typography sx={{ fontSize: 11.5, color: 'var(--ink-500)', fontWeight: 600, mb: 0.5 }}>
                  SPECIFIC SIZE
                </Typography>
                {product.sizeVariants && product.sizeVariants.length > 0 ? (
                  <TextField
                    select
                    size="small"
                    fullWidth
                    value={specificSize}
                    onChange={(e) => setSpecificSize(e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2.5,
                        bgcolor: 'var(--ink-50)',
                        '& fieldset': { borderColor: 'var(--ink-200)' },
                      }
                    }}
                  >
                    {product.sizeVariants.map((sv) => (
                      <MenuItem key={sv.size} value={sv.size}>
                        {sv.size} {sv.netWeight ? `(Net: ${sv.netWeight} kg / Gross: ${sv.grossWeight} kg)` : ''} — ₹{sv.price}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <TextField
                    size="small"
                    fullWidth
                    placeholder={product.sizePlaceholder || 'e.g. 400x300x300 mm'}
                    value={specificSize}
                    onChange={(e) => setSpecificSize(e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2.5,
                        bgcolor: 'var(--ink-50)',
                        '& fieldset': { borderColor: 'var(--ink-200)' },
                      }
                    }}
                  />
                )}
                {selectedVariant && (
                  <Typography sx={{ fontSize: 12, color: 'var(--brand-600)', fontWeight: 600, mt: 1 }}>
                    Packaging: {selectedVariant.packingType || 'Cartoon'} {selectedVariant.netWeight ? `· Net Weight: ${selectedVariant.netWeight} kg · Gross Weight: ${selectedVariant.grossWeight} kg` : ''}
                  </Typography>
                )}
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11.5, color: 'var(--ink-500)', fontWeight: 600, mb: 0.5 }}>
                  QUANTITY
                </Typography>
                <QuantityStepper
                  value={effectiveQty}
                  onChange={setQty}
                  min={product.moq}
                  max={product.availableStock || undefined}
                  unit={product.unit}
                />
              </Box>
            </Box>

            {/* Container Options */}
            {product.showContainerOptions !== false && (
            <Box sx={{ mb: 3.5 }}>
              <Typography sx={{ fontSize: 11.5, color: 'var(--ink-500)', fontWeight: 600, mb: 1 }}>
                CONTAINER OPTION
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant={containerOption === 'full' ? 'contained' : 'outlined'}
                  onClick={() => setContainerOption('full')}
                  sx={{
                    flex: 1,
                    py: 1,
                    borderRadius: 2.5,
                    fontSize: 13,
                    fontWeight: 700,
                    textTransform: 'none',
                    borderColor: 'var(--ink-200)',
                    color: containerOption === 'full' ? '#fff' : 'var(--ink-800)',
                    '&:hover': {
                      borderColor: 'var(--ink-300)',
                    }
                  }}
                >
                  {product.containerOptionFull || 'Full Container'}
                </Button>
                <Button
                  variant={containerOption === 'half' ? 'contained' : 'outlined'}
                  onClick={() => setContainerOption('half')}
                  sx={{
                    flex: 1,
                    py: 1,
                    borderRadius: 2.5,
                    fontSize: 13,
                    fontWeight: 700,
                    textTransform: 'none',
                    borderColor: 'var(--ink-200)',
                    color: containerOption === 'half' ? '#fff' : 'var(--ink-800)',
                    '&:hover': {
                      borderColor: 'var(--ink-300)',
                    }
                  }}
                >
                  {product.containerOptionHalf || 'Half Container'}
                </Button>
              </Box>
            </Box>
            )}

            <Box sx={{ display: 'flex', gap: { xs: 1.5, md: 3 }, justifyContent: 'center' }}>
              <Button
                variant="contained"
                size="large"
                sx={{
                  width: '200px',
                  py: { xs: 1, md: 1.5 },
                  fontSize: { xs: 13, md: 15 },
                  whiteSpace: 'nowrap',
                }}
                disabled={outOfStock}
                onClick={handleAdd}
              >
                {outOfStock ? 'Out of stock' : 'Send enquiry'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Description */}
      <Box sx={{ mt: { xs: 6, md: 8 }, maxWidth: '800px' }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Product description
        </Typography>
        <Typography color="text.secondary" sx={{ lineHeight: 1.7, mb: 4 }}>
          {product.description}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {[
            // Executive-editable global trust badges
            ...trustBadges.map((b) => ({ icon: trustIcon(b.icon), label: b.label })),
            // Auto-derived from product data
            { icon: <PublicRoundedIcon />, label: `Origin · ${product.origin}` },
          ].map((f, i) => (
            <Box
              key={i}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1.25,
                borderRadius: 2.5,
                border: '1px solid var(--ink-200)',
                bgcolor: '#fff',
                color: 'var(--brand-700)',
                flex: { xs: '1 1 100%', sm: '0 1 auto' },
              }}
            >
              {f.icon}
              <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-800)' }}>{f.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}
