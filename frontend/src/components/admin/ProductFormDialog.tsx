import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Box,
} from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import type { Product } from '@/types'
import { COUNTRIES } from '@/constants/countries'

interface Props {
  open: boolean
  initial: Product | null
  categories: string[]
  onClose: () => void
  onSave: (product: Product) => void
  loading?: boolean
}

const blank = {
  name: '',
  brand: '',
  category: '',
  origin: 'India',
  grade: 'Premium',
}

export default function ProductFormDialog({ open, initial, categories, onClose, onSave, loading }: Props) {
  const [form, setForm] = useState(blank)
  const isPending = loading ?? false

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          name: initial.name,
          brand: initial.brand || '',
          category: initial.category,
          origin: initial.origin || 'India',
          grade: initial.specifications?.Grade || 'Premium',
        })
      } else {
        setForm({
          ...blank,
          category: categories[0] ?? '',
        })
      }
    }
  }, [open, initial, categories])

  const str = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const valid = form.name.trim().length >= 2 && form.category && form.origin.trim() && form.grade.trim()

  const handleSave = () => {
    const product: Product = {
      id: initial?.id ?? `p-${Date.now()}`,
      sku: '',
      name: form.name.trim(),
      brand: form.brand.trim(),
      category: form.category,
      images: initial?.images ?? [],
      shortDescription: '',
      description: '',
      specifications: {
        Origin: form.origin,
        Grade: form.grade,
      },
      unit: 'pcs',
      moq: 1,
      availableStock: 0,
      stockStatus: 'in_stock',
      basePrice: 0,
      currency: '₹',
      pricingSlabs: [],
      rating: 5,
      origin: form.origin,
      leadTimeDays: 0,
    }
    onSave(product)
    if (loading === undefined) {
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={isPending ? undefined : onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
      <DialogTitle sx={{ fontFamily: '"Bricolage Grotesque", serif', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {initial ? 'Edit product' : 'Add product'}
        <IconButton size="small" onClick={onClose} disabled={isPending}><CloseRoundedIcon /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 3 }}>
        <TextField
          label="Product name *"
          value={form.name}
          onChange={str('name')}
          fullWidth
          size="small"
          disabled={isPending}
        />

        <TextField
          label="Brand"
          placeholder="e.g. Shimla Fresh / Imported"
          value={form.brand}
          onChange={str('brand')}
          fullWidth
          size="small"
          disabled={isPending}
        />
        
        <TextField
          label="Category *"
          value={form.category}
          onChange={str('category')}
          select
          fullWidth
          size="small"
          disabled={isPending}
        >
          {categories.map((c) => (
            <MenuItem key={c} value={c}>{c}</MenuItem>
          ))}
        </TextField>

        <TextField
          label="Origin *"
          value={form.origin}
          onChange={str('origin')}
          select
          fullWidth
          size="small"
          disabled={isPending}
        >
          {COUNTRIES.map((country) => (
            <MenuItem key={country} value={country}>
              {country}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Grade *"
          placeholder="e.g. Premium / A+"
          value={form.grade}
          onChange={str('grade')}
          fullWidth
          size="small"
          disabled={isPending}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2.5 }} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={!valid || isPending} sx={{ borderRadius: 2.5, fontWeight: 700, px: 4 }}>
          {isPending ? 'Saving...' : (initial ? 'Save changes' : 'Add product')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
