import { useMemo, useState } from 'react'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { Box, Typography, Button, IconButton, Tooltip } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import TableCard from '@/components/admin/TableCard'
import { gridSx } from '@/components/admin/gridStyles'
import ProductFormDialog from '@/components/admin/ProductFormDialog'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import {
  useGetProductsQuery,
  useGetCategoriesQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} from '@/redux/api'
import type { Product } from '@/types'
import toast from 'react-hot-toast'

export default function ProductsAdminPage() {
  const { data: serverProducts, isLoading } = useGetProductsQuery({ isExecutive: true })
  const { data: categories, refetch: refetchCategories } = useGetCategoriesQuery()

  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation()
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation()
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation()

  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)

  const filtered = useMemo(() => {
    const s = search.toLowerCase()
    const list = serverProducts || []
    return list.filter((p) => 
      p.name.toLowerCase().includes(s) || 
      p.category.toLowerCase().includes(s) ||
      p.origin.toLowerCase().includes(s)
    )
  }, [serverProducts, search])

  const categoryNames = useMemo(() => {
    return categories?.map((c) => c.name) ?? []
  }, [categories])

  const handleSave = async (product: Product) => {
    const catDoc = categories?.find((c) => c.name === product.category)
    if (!catDoc) {
      toast.error('Selected category is invalid or not found')
      return
    }

    const payload = {
      name: product.name,
      category: catDoc.id, // Mongoose ObjectId
      origin: product.origin,
      grade: product.specifications.Grade,
    }

    try {
      if (editing) {
        await updateProduct({ id: editing.id, ...payload }).unwrap()
        toast.success('Product updated successfully')
      } else {
        await createProduct(payload).unwrap()
        toast.success('Product added successfully')
      }
      setFormOpen(false)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save product')
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteProduct(deleting.id).unwrap()
      toast.success('Product deleted successfully')
      setDeleting(null)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to delete product')
    }
  }

  const columns: GridColDef<Product>[] = [
    {
      field: 'name',
      headerName: 'Product Name',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Typography sx={{ fontWeight: 600, fontSize: 13.5, display: 'flex', alignItems: 'center', height: '100%' }}>
          {params.row.name}
        </Typography>
      ),
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 180,
      renderCell: (params) => <span style={{ display: 'flex', alignItems: 'center', height: '100%' }}>{params.row.category}</span>,
    },
    {
      field: 'origin',
      headerName: 'Origin',
      width: 150,
      renderCell: (params) => <span style={{ display: 'flex', alignItems: 'center', height: '100%' }}>{params.row.origin}</span>,
    },
    {
      field: 'grade',
      headerName: 'Grade',
      width: 150,
      renderCell: (params) => <span style={{ display: 'flex', alignItems: 'center', height: '100%' }}>{params.row.specifications?.Grade || 'Premium'}</span>,
    },
    {
      field: 'packaging',
      headerName: 'Packaging & Sizes',
      width: 220,
      renderCell: (params) => {
        const packing = params.row.specifications?.['Packing Type'] || 'Cartoon'
        const sizeOrCount = params.row.specifications?.['Size or Count'] || '-'
        return (
          <span style={{ display: 'flex', alignItems: 'center', height: '100%', fontSize: '13px', color: 'var(--ink-600)' }} title={`${packing} · Sizes: ${sizeOrCount}`}>
            {packing} ({sizeOrCount})
          </span>
        )
      },
    },
    {
      field: 'availableStock',
      headerName: 'Available Stock',
      width: 160,
      renderCell: (params) => (
        <span style={{ display: 'flex', alignItems: 'center', height: '100%', fontWeight: 700, color: 'var(--brand-700)' }}>
          {params.row.availableStock?.toLocaleString('en-IN')} {params.row.unit}
        </span>
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 100,
      sortable: false,
      filterable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: (p) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', alignItems: 'center', height: '100%' }}>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={() => {
                setEditing(p.row)
                setFormOpen(true)
              }}
            >
              <EditRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => setDeleting(p.row)} sx={{ color: 'var(--ink-500)' }}>
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <TableCard
        title="Products"
        count={filtered.length}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search products…"
        actions={
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            Add product
          </Button>
        }
      >
        <DataGrid
          rows={filtered}
          columns={columns}
          loading={isLoading}
          rowHeight={52}
          disableRowSelectionOnClick
          disableColumnMenu
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          sx={gridSx}
        />
      </TableCard>

      <ProductFormDialog
        open={formOpen}
        initial={editing}
        categories={categoryNames}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        loading={isCreating || isUpdating}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete product?"
        message={
          <>
            This will remove <strong>{deleting?.name}</strong> from the catalog. This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
        loading={isDeleting}
      />
    </Box>
  )
}
