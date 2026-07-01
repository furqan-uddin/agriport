import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  Switch,
  FormControlLabel,
  InputAdornment,
  Checkbox,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'

import { api, useGetCrmCustomersQuery, useGetProductsQuery } from '@/redux/api'
import { useAppDispatch } from '@/redux/hooks'
import { generateSlabs } from '@/utils/pricing'
import type { Product, PricingSlab, PurchaseDraft, ArrivalDraft, SaleDraft, SaleItemDraft } from '@/types'
import toast from 'react-hot-toast'
import { COUNTRIES } from '@/constants/countries'

const PACKING_TYPES = ['Cartoon', 'Basket']

const emptyForm = (): Partial<Product> => ({
  name: '',
  category: '',
  shortDescription: '',
  description: '',
  origin: '',
  unit: 'pcs',
  moq: 1,
  availableStock: 0,
  stockStatus: 'in_stock',
  basePrice: 0,
  leadTimeDays: 7,
  isNew: false,
  isFeatured: false,
  tags: [],
  specifications: {
    Grade: 'Imported',
    Packing: '',
    'Brand Name': '',
    'Packing Type': 'Cartoon',
    'Size or Count': '',
    Origin: '',
  },
  pricingSlabs: [],
  images: [],
  currency: '₹',
  rating: 4.0,
  sizePlaceholder: '',
  containerOptionFull: '',
  containerOptionHalf: '',
  showContainerOptions: true,
  sizeVariants: [],
  weightVariant: undefined,
})

interface StockFormDialogProps {
  open: boolean
  onClose: () => void
  productToEdit: Product | null
  onSave?: (product: Product, mode: 'add' | 'update') => void
  onSavePurchase?: (draft: PurchaseDraft) => void
  onSaveArrival?: (draft: ArrivalDraft) => void
  onSaveSale?: (draft: SaleItemDraft) => void
  formMode?: 'sale' | 'purchase' | 'arrival'
}

const getQtyLabel = (packingType: string, mode: string) => {
  const plural = packingType === 'Cartoon' ? 'Cartons' : `${packingType}s`
  if (mode === 'sale') return `Quantity to Sell (${plural}) *`
  if (mode === 'purchase') return `Quantity to Purchase (${plural}) *`
  if (mode === 'arrival') return `Quantity Arriving (${plural}) *`
  return `Available Stock (${plural}) *`
}

export default function StockFormDialog({ open, onClose, productToEdit, onSave, onSavePurchase, onSaveArrival, onSaveSale, formMode }: StockFormDialogProps) {
  const { data: customers } = useGetCrmCustomersQuery()
  const { data: dbProducts } = useGetProductsQuery({ isExecutive: true })
  const dispatch = useAppDispatch()

  const [form, setForm] = useState<Partial<Product>>(emptyForm())
  const [tagsInput, setTagsInput] = useState('')
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [slabs, setSlabs] = useState<PricingSlab[]>([])

  // Inline Variant Editor State
  const [showInlineEditor, setShowInlineEditor] = useState(false)
  const [editingSizeIndex, setEditingSizeIndex] = useState<number | null>(null)

  // Size Variant Input Fields
  const [sizeInput, setSizeInput] = useState('')
  const [stockInput, setStockInput] = useState<number | ''>('')
  const [priceInput, setPriceInput] = useState<number | ''>('')
  const [packingTypeInput, setPackingTypeInput] = useState('Cartoon')
  const [netWeightInput, setNetWeightInput] = useState<number | ''>('')
  const [grossWeightInput, setGrossWeightInput] = useState<number | ''>('')


  const [selectedCustomerId, setSelectedCustomerId] = useState('')

  useEffect(() => {
    if (open) {
      setSelectedCustomerId('')
      if (productToEdit) {
        setForm({
          ...productToEdit,
          specifications: { ...productToEdit.specifications },
          sizePlaceholder: productToEdit.sizePlaceholder ?? '',
          containerOptionFull: productToEdit.containerOptionFull ?? '',
          containerOptionHalf: productToEdit.containerOptionHalf ?? '',
          showContainerOptions: productToEdit.showContainerOptions ?? true,
          sizeVariants: productToEdit.sizeVariants ?? [],
          weightVariant: productToEdit.weightVariant,
        })
        setTagsInput((productToEdit.tags ?? []).join(', '))
        setUploadedImages(productToEdit.images ?? [])
        setSlabs(productToEdit.pricingSlabs?.length ? productToEdit.pricingSlabs.map((s) => ({ ...s })) : generateSlabs(productToEdit.basePrice ?? 0))
      } else {
        setForm(emptyForm())
        setTagsInput('')
        setUploadedImages([])
        setSlabs(generateSlabs(0))
      }
      setShowInlineEditor(false)
      setEditingSizeIndex(null)
      setSizeInput('')
      setStockInput('')
      setPriceInput('')
      setPackingTypeInput('Cartoon')
    }
  }, [open, productToEdit])


  const handleSaveSize = () => {
    const sizeVal = sizeInput.trim()
    if (!sizeVal) {
      toast.error('Size is required')
      return
    }
    const currentSizes = form.sizeVariants ?? []

    // Duplicate check (by size+packingType combination)
    const isDuplicate = currentSizes.some((v, idx) => {
      if (idx === editingSizeIndex) return false
      return v.size.toLowerCase() === sizeVal.toLowerCase() &&
        (v.packingType || 'Cartoon') === packingTypeInput
    })
    if (isDuplicate) {
      toast.error('A variant with the same size and packing type already exists.')
      return
    }

    if (stockInput === '' || stockInput < 0 || isNaN(Number(stockInput))) {
      toast.error('Available stock must be a non-negative number')
      return
    }

    if (formMode === 'sale') {
      const matchedProduct = dbProducts?.find((p) => p.name === form.name)
      if (!matchedProduct) {
        toast.error('Please select a product first.')
        return
      }
      const existingDbVariant = matchedProduct.sizeVariants?.find(
        (v) => v.size.toLowerCase() === sizeVal.toLowerCase() &&
          (v.packingType || 'Cartoon') === packingTypeInput
      )
      if (!existingDbVariant) {
        toast.error(`Size variant "${sizeVal}" (${packingTypeInput}) is not available in stock for this product.`)
        return
      }
      const maxAvailable = existingDbVariant.stock || 0
      if (Number(stockInput) > maxAvailable) {
        toast.error(`Quantity to Sell exceeds available stock for size "${sizeVal}". Available: ${maxAvailable}`)
        return
      }
    }

    if (priceInput === '' || priceInput < 0 || isNaN(Number(priceInput))) {
      const priceLabel = formMode === 'purchase' ? 'Purchased Price' : (formMode === 'arrival' ? 'Price' : 'Selling Price')
      toast.error(`${priceLabel} must be a non-negative number`)
      return
    }
    if (netWeightInput !== '' && (netWeightInput < 0 || isNaN(Number(netWeightInput)))) {
      toast.error('Net Weight must be a non-negative number')
      return
    }
    if (grossWeightInput !== '' && (grossWeightInput < 0 || isNaN(Number(grossWeightInput)))) {
      toast.error('Gross Weight must be a non-negative number')
      return
    }

    const newSizeVar = {
      size: sizeVal,
      stock: Number(stockInput),
      price: Number(priceInput),
      packingType: packingTypeInput,
      netWeight: netWeightInput === '' ? undefined : Number(netWeightInput),
      grossWeight: grossWeightInput === '' ? undefined : Number(grossWeightInput),
    }

    const updated = [...currentSizes]
    if (editingSizeIndex !== null) {
      updated[editingSizeIndex] = newSizeVar
    } else {
      updated.push(newSizeVar)
    }

    setForm((f) => ({ ...f, sizeVariants: updated }))

    setSizeInput('')
    setStockInput('')
    setPriceInput('')
    setPackingTypeInput('Cartoon')
    setNetWeightInput('')
    setGrossWeightInput('')
    setEditingSizeIndex(null)
    toast.success(editingSizeIndex !== null ? 'Size variant updated' : 'Size variant added')
  }

  const handleEditRow = (idx: number) => {
    const v = (form.sizeVariants ?? [])[idx]
    setSizeInput(v.size)
    setStockInput(v.stock)
    setPriceInput(v.price)
    setPackingTypeInput(v.packingType ?? 'Cartoon')
    setNetWeightInput(v.netWeight ?? '')
    setGrossWeightInput(v.grossWeight ?? '')
    setEditingSizeIndex(idx)

    setShowInlineEditor(true)
  }

  const handleDeleteRow = (idx: number) => {
    const updatedSizes = (form.sizeVariants ?? []).filter((_, i) => i !== idx)
    setForm((f) => ({ ...f, sizeVariants: updatedSizes }))
    toast.success('Variant deleted')
  }


  const handleImageUpload = (slotIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      setUploadedImages((prev) => {
        const next = [...prev]
        // ensure array has 7 slots
        while (next.length < 7) next.push('')
        next[slotIdx] = result
        return next
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const removeImage = (slotIdx: number) =>
    setUploadedImages((prev) => {
      const next = [...prev]
      while (next.length < 7) next.push('')
      next[slotIdx] = ''
      return next
    })

  const setField = (key: keyof Product, val: unknown) =>
    setForm((f) => ({ ...f, [key]: val }))

  const setSpec = (key: string, val: string) =>
    setForm((f) => ({ ...f, specifications: { ...(f.specifications ?? {}), [key]: val } }))

  const handleSave = () => {
    if (formMode === 'purchase') {
      if (!selectedCustomerId) {
        toast.error('Vendor is required.')
        return
      }
      if (!form.name) {
        toast.error('Product is required.')
        return
      }
      const matchedProduct = dbProducts?.find((p) => p.name === form.name)
      if (!matchedProduct) {
        toast.error('Selected product not found.')
        return
      }

      // Quantity = total carton count (NOT weight-based)
      const quantity = form.sizeVariants?.reduce((sum, v) => sum + v.stock, 0) || 0
      const buyPrice = form.sizeVariants?.[0]?.price || matchedProduct.basePrice || 0
      const unit = matchedProduct.unit || 'pcs'

      if (quantity <= 0) {
        toast.error('At least one variant with a positive quantity must be added.')
        return
      }

      const selectedVendor = customers?.find((c) => c.id === selectedCustomerId)
      const vendorName = selectedVendor ? (selectedVendor.company || selectedVendor.name) : 'Unknown Vendor'

      const status = form.isFeatured ? 'received' : (form.isNew ? 'pending' : 'received')
      const notes = [
        form.containerOptionFull ? `Full container: ${form.containerOptionFull}` : '',
        form.containerOptionHalf ? `Cold storage: ${form.containerOptionHalf}` : '',
        form.shortDescription ? `Notes: ${form.shortDescription}` : '',
        form.sizeVariants?.length ? `Variants: ${form.sizeVariants.map(v => `${v.size} (${v.stock} ${v.packingType || 'Cartoon'}${v.netWeight ? ` · Net: ${v.netWeight}kg` : ''})`).join(', ')}` : '',
      ].filter(Boolean).join(', ')

      const finalImages = uploadedImages.filter(Boolean)
      const brandValue = form.brand || form.specifications?.['Brand Name'] || ''

      onSavePurchase?.({
        vendorName,
        vendorPhone: selectedVendor?.phone || '',
        productId: matchedProduct.id,
        productName: matchedProduct.name,
        brand: brandValue,
        quantity,
        unit,
        buyPrice,
        purchaseDate: new Date().toISOString(),
        status,
        notes,
        specifications: {
          Grade: form.specifications?.Grade || 'Premium',
          ...(brandValue ? { 'Brand Name': brandValue } : {}),
          ...(form.specifications?.['Packing Type'] ? { 'Packing Type': form.specifications['Packing Type'] } : {}),
          ...(form.sizeVariants?.length ? { 'Size or Count': form.sizeVariants.map(v => v.size).join(', ') } : {}),
        },
        images: finalImages,
        sizeVariants: form.sizeVariants ?? [],
        origin: form.origin || form.specifications?.Origin || '',
        leadTimeDays: form.leadTimeDays ? Number(form.leadTimeDays) : 0,
      })
      onClose()
      return
    }

    if (formMode === 'arrival') {
      if (!form.name) {
        toast.error('Product is required.')
        return
      }
      const matchedProduct = dbProducts?.find((p) => p.name === form.name)
      if (!matchedProduct) {
        toast.error('Selected product not found.')
        return
      }

      // Quantity = total carton count (NOT weight-based)
      const requestedChange = form.sizeVariants?.reduce((sum, v) => sum + v.stock, 0) || 0
      if (requestedChange <= 0) {
        toast.error('At least one variant with a positive quantity must be added.')
        return
      }

      const notes = [
        form.containerOptionFull ? `Full container: ${form.containerOptionFull}` : '',
        form.containerOptionHalf ? `Cold storage: ${form.containerOptionHalf}` : '',
        form.shortDescription ? `Notes: ${form.shortDescription}` : '',
        form.sizeVariants?.length ? `Variants: ${form.sizeVariants.map(v => `${v.size} (${v.stock} ${v.packingType || 'Cartoon'}${v.netWeight ? ` · Net: ${v.netWeight}kg` : ''})`).join(', ')}` : '',
      ].filter(Boolean).join(', ')

      const finalImages = uploadedImages.filter(Boolean)
      const brandValue = form.brand || form.specifications?.['Brand Name'] || ''

      onSaveArrival?.({
        productId: matchedProduct.id,
        productName: matchedProduct.name,
        category: matchedProduct.category || 'General',
        currentStock: matchedProduct.availableStock || 0,
        requestedChange,
        type: 'add',
        notes,
        specifications: {
          Grade: form.specifications?.Grade || 'Premium',
          ...(brandValue ? { 'Brand Name': brandValue } : {}),
          ...(form.specifications?.['Packing Type'] ? { 'Packing Type': form.specifications['Packing Type'] } : {}),
          ...(form.sizeVariants?.length ? { 'Size or Count': form.sizeVariants.map(v => v.size).join(', ') } : {}),
        },
        images: finalImages,
        sizeVariants: form.sizeVariants ?? [],
        origin: form.origin || form.specifications?.Origin || '',
        leadTimeDays: form.leadTimeDays ? Number(form.leadTimeDays) : 0,
      })
      onClose()
      return
    }

    if (formMode === 'sale') {
      if (!form.name) {
        toast.error('Product is required.')
        return
      }
      const matchedProduct = dbProducts?.find((p) => p.name === form.name)
      if (!matchedProduct) {
        toast.error('Selected product not found.')
        return
      }

      // Quantity = total carton count across all sale variants (NOT weight-based)
      const quantity = form.sizeVariants?.reduce((sum, v) => sum + v.stock, 0) || 0
      // Use first variant's price as the unit price for the order line
      const unitPrice = form.sizeVariants?.[0]?.price || matchedProduct.basePrice || 0
      const unit = matchedProduct.unit || 'pcs'
      // Capture the first variant's identity for per-variant stock decrement
      const firstVariant = form.sizeVariants?.[0]
      const variantSize = firstVariant?.size || ''
      const variantPackingType = firstVariant?.packingType || 'Cartoon'

      if (quantity <= 0) {
        toast.error('At least one variant with a positive quantity must be added.')
        return
      }

      // Double check all sizeVariants stock limits
      for (const saleVar of form.sizeVariants || []) {
        const dbVar = matchedProduct.sizeVariants?.find(
          (v) => v.size.toLowerCase() === saleVar.size.toLowerCase() &&
            (v.packingType || 'Cartoon') === (saleVar.packingType || 'Cartoon')
        )
        const maxAvailable = dbVar ? (dbVar.stock || 0) : 0
        if (saleVar.stock > maxAvailable) {
          toast.error(`Quantity for size "${saleVar.size}" (${saleVar.packingType || 'Cartoon'}) exceeds available stock. Available: ${maxAvailable}`)
          return
        }
      }

      if (quantity > (matchedProduct.availableStock || 0)) {
        toast.error(`Quantity exceeds total available stock. Available: ${matchedProduct.availableStock}`)
        return
      }

      onSaveSale?.({
        productId: matchedProduct.id,
        productName: matchedProduct.name,
        quantity,
        unit,
        unitPrice,
        variantSize,
        variantPackingType,
      })
      onClose()
      return
    }

    if (!form.name?.trim() || !form.unit?.trim()) {
      toast.error('Name and Unit are required.')
      return
    }
    // Ensure category is always set to Agro Commodities
    const finalCategory = form.category?.trim() || 'Agro Commodities'
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const base = form.basePrice ?? 0
    const finalSlabs: PricingSlab[] = slabs.length ? slabs : generateSlabs(base)

    let savedProduct: Product
    let saveMode: 'add' | 'update'

    if (productToEdit) {
      const updated: Product = {
        ...productToEdit,
        ...form,
        category: finalCategory,
        tags,
        images: uploadedImages,
        pricingSlabs: finalSlabs,
        specifications: {
          ...form.specifications,
          Grade: 'Imported',
          Origin: form.origin ?? form.specifications?.Origin ?? '',
        },
        sizePlaceholder: form.sizePlaceholder || undefined,
        containerOptionFull: form.containerOptionFull || undefined,
        containerOptionHalf: form.containerOptionHalf || undefined,
        showContainerOptions: form.showContainerOptions ?? true,
      } as Product

      savedProduct = updated
      saveMode = 'update'
      toast.success(`"${updated.name}" updated successfully`)
    } else {
      const newId = `p${Date.now()}`
      const newProduct: Product = {
        id: newId,
        name: form.name!,
        category: finalCategory,
        images: uploadedImages,

        shortDescription: form.shortDescription ?? '',
        description: form.description ?? '',
        specifications: {
          Grade: 'Imported',
          Packing: form.specifications?.Packing ?? '',
          'Brand Name': form.specifications?.['Brand Name'] ?? '',
          'Packing Type': form.specifications?.['Packing Type'] ?? 'Cartoon',
          'Size or Count': form.specifications?.['Size or Count'] ?? '',
          Origin: form.origin ?? '',
        },
        unit: form.unit!,
        moq: form.moq ?? 1,
        availableStock: form.availableStock ?? 0,
        stockStatus: form.stockStatus ?? 'in_stock',
        basePrice: base,
        currency: '₹',
        pricingSlabs: finalSlabs,
        rating: 4.0,
        origin: form.origin ?? '',
        leadTimeDays: form.leadTimeDays ?? 7,
        isNew: form.isNew ?? false,
        isFeatured: form.isFeatured ?? false,
        tags,
        sizePlaceholder: form.sizePlaceholder || undefined,
        containerOptionFull: form.containerOptionFull || undefined,
        containerOptionHalf: form.containerOptionHalf || undefined,
        showContainerOptions: form.showContainerOptions ?? true,
        sizeVariants: form.sizeVariants ?? [],
        weightVariant: form.weightVariant,
      }
      savedProduct = newProduct
      saveMode = 'add'
      toast.success(`"${newProduct.name}" added successfully`)
    }

    dispatch(api.util.invalidateTags(['Product']))
    onSave?.(savedProduct, saveMode)
    onClose()
  }

  const specs = form.specifications ?? {}

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
      <DialogTitle sx={{ fontFamily: '"Bricolage Grotesque", serif', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {formMode === 'sale'
          ? 'Add Product to Sale'
          : formMode === 'purchase'
          ? 'Add Product to Purchase'
          : formMode === 'arrival'
          ? 'Configure Stock Arrival'
          : productToEdit
          ? 'Edit Stock'
          : 'Add New Stock'}
        <IconButton size="small" onClick={onClose}><CloseRoundedIcon /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 3 }}>
        {(formMode === 'purchase' || !formMode) && (
          <>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 13.5, mb: 1.5, color: 'var(--ink-600)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Select Customer
              </Typography>
              <Box className="grid grid-cols-1 gap-3">
                <TextField
                  select
                  label="Select Customer (Company or Mobile)"
                  size="small"
                  fullWidth
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                >
                  {(customers ?? []).map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.company} — {c.phone}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            </Box>
            <Divider />
          </>
        )}

        {!formMode && (
          <>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 13.5, mb: 1.5, color: 'var(--ink-600)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Company Name
              </Typography>
              <Box className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextField
                  label="Company Name"
                  size="small"
                  fullWidth
                  disabled
                  value="GLOBIRA INTERNATIONAL TRADING CO."
                />
              </Box>
            </Box>
            <Divider />
          </>
        )}

        {/* Basic Info */}
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 13.5, mb: 1.5, color: 'var(--ink-600)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Basic Information
          </Typography>
          <Box className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField
              label="Product Name *"
              size="small"
              select
              fullWidth
              value={form.name ?? ''}
              onChange={(e) => {
                const selectedName = e.target.value
                const matched = (dbProducts || []).find((p) => p.name === selectedName)
                if (matched) {
                  const matchedOrigin = matched.origin || matched.specifications?.Origin || '';
                  const matchedGrade = matched.specifications?.Grade || 'Premium';
                  const matchedBrand = matched.brand || matched.specifications?.['Brand Name'] || '';
                  setForm((f) => ({
                    ...f,
                    name: selectedName,
                    category: matched.category,
                    origin: matchedOrigin,
                    brand: matchedBrand,
                    specifications: {
                      ...(f.specifications ?? {}),
                      Grade: matchedGrade,
                      Origin: matchedOrigin,
                      'Brand Name': matchedBrand,
                    }
                  }))
                } else {
                  setField('name', selectedName)
                }
              }}
            >
              {(dbProducts || []).map((p) => (
                <MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Brand"
              size="small"
              fullWidth
              value={form.brand ?? form.specifications?.['Brand Name'] ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setForm((f) => ({
                  ...f,
                  brand: val,
                  specifications: {
                    ...(f.specifications ?? {}),
                    'Brand Name': val,
                  }
                }));
              }}
            />
            <TextField
              label="Category *"
              size="small"
              fullWidth
              value={form.category || 'Agro Commodities'}
              slotProps={{ input: { readOnly: true } }}
              onFocus={() => { if (!form.category?.trim()) setField('category', 'Agro Commodities') }}
            />
            {formMode !== 'sale' && (
              <>
                <TextField
                  label="Origin (Country)"
                  size="small"
                  select
                  fullWidth
                  value={form.origin ?? ''}
                  onChange={(e) => setField('origin', e.target.value)}
                >
                  {COUNTRIES.map((country) => (
                    <MenuItem key={country} value={country}>
                      {country}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Lead Time (days)"
                  size="small"
                  type="number"
                  fullWidth
                  value={form.leadTimeDays ?? ''}
                  onChange={(e) => setField('leadTimeDays', Number(e.target.value))}
                />
                <Box className="flex gap-4">
                  <FormControlLabel
                    control={<Switch checked={form.isNew ?? false} onChange={(e) => setField('isNew', e.target.checked)} />}
                    label={<Typography sx={{ fontSize: 13.5 }}>Upcoming Arrivals</Typography>}
                  />
                  <FormControlLabel
                    control={<Switch checked={form.isFeatured ?? false} onChange={(e) => setField('isFeatured', e.target.checked)} />}
                    label={<Typography sx={{ fontSize: 13.5 }}>stock</Typography>}
                  />
                </Box>
              </>
            )}
          </Box>
        </Box>

        <Divider />

        {/* Requirements (Size & Count Variants) */}
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 13.5, mb: 1.5, color: 'var(--ink-600)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            size and count
          </Typography>

          <Button
            variant="outlined"
            startIcon={<AddRoundedIcon />}
            onClick={() => {
              setShowInlineEditor(true)
              setSizeInput('')
              setStockInput('')
              setPriceInput('')
              setPackingTypeInput('Cartoon')
              setEditingSizeIndex(null)
            }}
            sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none', mb: 2 }}
          >
            Add Variant
          </Button>

          {/* Inline Editor Form */}
          {showInlineEditor && (
            <Box
              sx={{
                p: 1.5,
                mb: 2.5,
                borderRadius: 2.5,
                border: '1px solid var(--brand-300)',
                bgcolor: 'var(--brand-50)',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              {/* Size Variant Section */}
              <Box>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'var(--brand-700)', mb: 1 }}>
                  {editingSizeIndex !== null ? 'Edit Size Variant' : 'Size Variant'}
                </Typography>
                <Box className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <TextField
                    label={formMode === 'sale' ? 'Size *' : 'Available Size *'}
                    placeholder="e.g. XL"
                    size="small"
                    fullWidth
                    slotProps={{
                      inputLabel: {
                        shrink: true,
                      },
                    }}
                    value={sizeInput}
                    onChange={(e) => setSizeInput(e.target.value)}
                  />
                  <TextField
                    label={getQtyLabel(packingTypeInput, formMode || '')}
                    placeholder="e.g. 25"
                    size="small"
                    type="number"
                    fullWidth
                    slotProps={{
                      inputLabel: {
                        shrink: true,
                      },
                    }}
                    value={stockInput}
                    onChange={(e) => setStockInput(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                  <TextField
                    label={formMode === 'purchase' ? 'Buy Price *' : 'Selling Price *'}
                    placeholder="e.g. 499"
                    size="small"
                    type="number"
                    fullWidth
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                      },
                      inputLabel: {
                        shrink: true,
                      },
                    }}
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                  <TextField
                    label="Packing Type *"
                    size="small"
                    select
                    fullWidth
                    value={packingTypeInput}
                    onChange={(e) => setPackingTypeInput(e.target.value)}
                  >
                    {PACKING_TYPES.map((pt) => (
                      <MenuItem key={pt} value={pt}>{pt}</MenuItem>
                    ))}
                  </TextField>
                </Box>

                {formMode !== 'sale' && (
                  <Box className="grid grid-cols-1 sm:grid-cols-2 gap-3" sx={{ mt: 1.5 }}>
                    <TextField
                      label="Net Weight *"
                      placeholder="e.g. 50"
                      size="small"
                      type="number"
                      fullWidth
                      slotProps={{
                        input: {
                          endAdornment: <InputAdornment position="end">/kg</InputAdornment>,
                        },
                        inputLabel: {
                          shrink: true,
                        },
                      }}
                      value={netWeightInput}
                      onChange={(e) => setNetWeightInput(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                    <TextField
                      label="Gross Weight *"
                      placeholder="e.g. 51.5"
                      size="small"
                      type="number"
                      fullWidth
                      slotProps={{
                        input: {
                          endAdornment: <InputAdornment position="end">/kg</InputAdornment>,
                        },
                        inputLabel: {
                          shrink: true,
                        },
                      }}
                      value={grossWeightInput}
                      onChange={(e) => setGrossWeightInput(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </Box>
                )}

                {stockInput && (
                  <Typography sx={{ fontSize: 12, color: 'var(--brand-600)', mt: 1, fontWeight: 600 }}>
                    Total to add: {stockInput} {packingTypeInput === 'Cartoon' ? 'Cartons' : `${packingTypeInput}s`}
                  </Typography>
                )}
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSaveSize}
                  sx={{ borderRadius: 1.5, fontWeight: 700, textTransform: 'none' }}
                >
                  {editingSizeIndex !== null ? 'Update Size' : 'Save Size'}
                </Button>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setShowInlineEditor(false)}
                  sx={{ color: 'var(--ink-500)', textTransform: 'none', fontWeight: 600 }}
                >
                  Close Editor
                </Button>
              </Box>
            </Box>
          )}

          {form.sizeVariants && form.sizeVariants.length > 0 && (
            <Box sx={{ mb: 2.5 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 1 }}>
                Saved Variants
              </Typography>
              <Box sx={{ border: '1px solid var(--ink-200)', borderRadius: 2, overflow: 'hidden', bgcolor: '#fff' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'var(--ink-50)', '& th': { fontWeight: 700, fontSize: 11, color: 'var(--ink-600)', borderColor: 'var(--ink-200)' } }}>
                      <TableCell>Size</TableCell>
                      <TableCell>Packing</TableCell>
                      {formMode !== 'sale' && (
                        <>
                          <TableCell>Net Weight</TableCell>
                          <TableCell>Gross Weight</TableCell>
                        </>
                      )}
                      <TableCell>{formMode === 'sale' || formMode === 'purchase' || formMode === 'arrival' ? 'Qty' : 'Stock'}</TableCell>
                      <TableCell>{formMode === 'purchase' ? 'Buy Price' : 'Selling Price'}</TableCell>
                      <TableCell align="right" sx={{ width: 80 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* Render Size Variants */}
                    {form.sizeVariants && form.sizeVariants.length > 0 ? (
                      form.sizeVariants.map((v, idx) => (
                        <TableRow key={`size-${idx}`} sx={{ '& td': { borderColor: 'var(--ink-100)', py: 0.5 } }}>
                          <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{v.size}</TableCell>
                          <TableCell sx={{ fontSize: 13 }}>{v.packingType ?? 'Cartoon'}</TableCell>
                          
                          {formMode !== 'sale' && (
                            <>
                              <TableCell sx={{ fontSize: 13 }}>{v.netWeight ? `${v.netWeight} kg` : '-'}</TableCell>
                              <TableCell sx={{ fontSize: 13 }}>{v.grossWeight ? `${v.grossWeight} kg` : '-'}</TableCell>
                            </>
                          )}

                          <TableCell sx={{ fontSize: 13 }}>{v.stock}</TableCell>
                          <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>₹{v.price}</TableCell>
                          
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                              <IconButton size="small" onClick={() => handleEditRow(idx)} title="Edit Row" sx={{ color: 'var(--brand-600)', p: 0.5 }}>
                                <EditRoundedIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleDeleteRow(idx)} title="Delete Row" sx={{ color: '#c0392b', p: 0.5 }}>
                                <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      null
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          )}



          {/* Container Options */}
          {formMode !== 'sale' && (
            <Box sx={{ mt: 2.5, p: 2, borderRadius: 2, border: '1px solid var(--ink-200)', bgcolor: 'var(--ink-50)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-600)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Container Option Buttons
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.showContainerOptions ?? true}
                      onChange={(e) => setField('showContainerOptions', e.target.checked)}
                      size="small"
                    />
                  }
                  label={<Typography sx={{ fontSize: 12, color: 'var(--ink-500)' }}>{(form.showContainerOptions ?? true) ? 'Visible' : 'Hidden'}</Typography>}
                />
              </Box>
              {(form.showContainerOptions ?? true) && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={form.containerOptionFull === 'Full Container at Port'}
                          onChange={(e) => {
                            setField('containerOptionFull', e.target.checked ? 'Full Container at Port' : '')
                          }}
                        />
                      }
                      label={<Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>Full Container at Port</Typography>}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={!!form.containerOptionHalf}
                          onChange={(e) => {
                            setField('containerOptionHalf', e.target.checked ? 'Cold Storage' : '')
                          }}
                        />
                      }
                      label={<Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>Available at Cold Storage</Typography>}
                    />
                  </Box>
                  {!!form.containerOptionHalf && (
                    <TextField
                      label="Cold Storage Name / Location *"
                      size="small"
                      fullWidth
                      placeholder="e.g. Fortune Cold Storage, Pune"
                      value={form.containerOptionHalf === 'Cold Storage' ? '' : form.containerOptionHalf}
                      onChange={(e) => setField('containerOptionHalf', e.target.value)}
                    />
                  )}
                </Box>
              )}
            </Box>
          )}
        </Box>

        {/* Specifications */}
        {formMode !== 'sale' && (
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 13.5, mb: 1.5, color: 'var(--ink-600)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Specifications
            </Typography>
            <Box className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField
                label="Grade"
                size="small"
                fullWidth
                slotProps={{
                  input: {
                    readOnly: true,
                  },
                }}
                value={specs['Grade'] || 'Premium'}
              />
              <TextField
                label="Brand Name"
                size="small"
                fullWidth
                value={specs['Brand Name'] ?? ''}
                onChange={(e) => setSpec('Brand Name', e.target.value)}
              />
            </Box>
          </Box>
        )}

        {formMode !== 'sale' && <Divider />}

        {/* Image Upload — 7 fixed variant slots */}
        {formMode !== 'sale' && (
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 0.25, color: 'var(--ink-600)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Product Images (7 Views)
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: 'var(--ink-400)', mb: 1.5 }}>
              Upload one image per slot — Main View + 6 angles.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              {['Main', 'Angle 2', 'Angle 3', 'Angle 4', 'Angle 5', 'Angle 6', 'Angle 7'].map((label, slotIdx) => {
                const src = uploadedImages[slotIdx] ?? ''
                return (
                  <Box key={slotIdx} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center', width: 72 }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {label}
                    </Typography>
                    <Box
                      sx={{
                        position: 'relative',
                        width: 72,
                        height: 72,
                        borderRadius: 2,
                        overflow: 'hidden',
                        border: src ? '2px solid var(--brand-400)' : '2px dashed var(--ink-300)',
                        bgcolor: src ? 'transparent' : 'var(--ink-50)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s',
                      }}
                      component={src ? 'div' : 'label'}
                    >
                      {src ? (
                        <>
                          <img
                            src={src}
                            alt={label}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => removeImage(slotIdx)}
                            sx={{
                              position: 'absolute',
                              top: 2,
                              right: 2,
                              bgcolor: 'rgba(0,0,0,0.55)',
                              color: '#fff',
                              p: '2px',
                              '&:hover': { bgcolor: 'rgba(200,30,30,0.85)' },
                            }}
                          >
                            <CloseRoundedIcon sx={{ fontSize: 12 }} />
                          </IconButton>
                          <Box
                            component="label"
                            sx={{
                              position: 'absolute',
                              bottom: 2,
                              right: 2,
                              bgcolor: 'rgba(0,0,0,0.55)',
                              color: '#fff',
                              borderRadius: 0.75,
                              px: 0.5,
                              py: '1px',
                              fontSize: 9,
                              fontWeight: 700,
                              cursor: 'pointer',
                              '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                            }}
                          >
                            Replace
                            <input
                              type="file"
                              accept="image/*"
                              hidden
                              onChange={(e) => handleImageUpload(slotIdx, e)}
                            />
                          </Box>
                        </>
                      ) : (
                        <>
                          <AddRoundedIcon sx={{ fontSize: 18, color: 'var(--ink-400)' }} />
                          <Typography sx={{ fontSize: 9, fontWeight: 600, color: 'var(--ink-400)', mt: 0.25 }}>Upload</Typography>
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) => handleImageUpload(slotIdx, e)}
                          />
                        </>
                      )}
                    </Box>
                  </Box>
                )
              })}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1.5 }}>
        <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 2.5 }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} sx={{ borderRadius: 2.5, fontWeight: 700, px: 4 }}>
          {formMode === 'purchase'
            ? 'Save Purchase'
            : formMode === 'arrival'
            ? 'Save Arrival'
            : formMode === 'sale'
            ? 'Add to Sale'
            : 'Add Stock'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
