import { useState, useMemo } from 'react'
import { Box, Typography, Button, TextField, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Switch } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import TableCard from '@/components/admin/TableCard'
import { gridSx } from '@/components/admin/gridStyles'
import { useGetCategoriesQuery, useCreateCategoryMutation, useUpdateCategoryMutation, useDeleteCategoryMutation } from '@/redux/api'
import type { Category } from '@/types'
import toast from 'react-hot-toast'

function StatusSwitch({ row, updateCategory }: { row: Category; updateCategory: any }) {
  const [updating, setUpdating] = useState(false)
  const val = row.isActive !== false

  const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUpdating(true)
    const nextVal = e.target.checked
    try {
      await updateCategory({ id: row.id, isActive: nextVal }).unwrap()
      toast.success(`Category "${row.name}" ${nextVal ? 'activated' : 'deactivated'} successfully`)
    } catch (err: any) {
      toast.error(err.data?.message || 'Failed to update category status')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', gap: 0.5 }}>
      <Switch
        size="small"
        checked={val}
        disabled={updating}
        onChange={handleToggle}
      />
      <Typography sx={{ fontSize: 13, color: val ? 'var(--brand-700)' : 'var(--ink-400)', fontWeight: 600 }}>
        {val ? 'Active' : 'Inactive'}
      </Typography>
    </Box>
  )
}

export default function CategoriesAdminPage() {
  const { data: categories, isLoading } = useGetCategoriesQuery()
  const [createCategory] = useCreateCategoryMutation()
  const [updateCategory] = useUpdateCategoryMutation()
  const [deleteCategory] = useDeleteCategoryMutation()
  const [search, setSearch] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editCategory, setEditCategory] = useState<Category | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteCandidate, setDeleteCandidate] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = useMemo(() => {
    if (!categories) return []
    const s = search.toLowerCase()
    return categories.filter((c) => c.name.toLowerCase().includes(s))
  }, [categories, search])

  const handleCreateCategory = async () => {
    const trimmed = newCategoryName.trim()
    if (!trimmed) {
      toast.error('Please enter a category name')
      return
    }
    if (categories?.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Category already exists')
      return
    }

    try {
      await createCategory({ name: trimmed }).unwrap()
      setNewCategoryName('')
      toast.success(`Category "${trimmed}" created successfully`)
    } catch (err: any) {
      toast.error(err.data?.message || 'Failed to create category')
    }
  }

  const handleEditClick = (category: Category) => {
    setEditCategory(category)
    setEditName(category.name)
  }

  const handleUpdateCategory = async () => {
    const trimmed = editName.trim()
    if (!trimmed) {
      toast.error('Please enter a category name')
      return
    }
    if (categories?.some((c) => c.id !== editCategory?.id && c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Category already exists')
      return
    }

    try {
      await updateCategory({ id: editCategory!.id, name: trimmed }).unwrap()
      setEditCategory(null)
      setEditName('')
      toast.success('Category updated successfully')
    } catch (err: any) {
      toast.error(err.data?.message || 'Failed to update category')
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return
    setDeleting(true)
    try {
      await deleteCategory(deleteCandidate.id).unwrap()
      toast.success(`Category "${deleteCandidate.name}" deleted successfully`)
      setDeleteCandidate(null)
    } catch (err: any) {
      toast.error(err.data?.message || 'Failed to delete category')
    } finally {
      setDeleting(false)
    }
  }

  const columns: GridColDef<Category>[] = [
    {
      field: 'name',
      headerName: 'Category Name',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
          {params.row.name}
        </Typography>
      ),
    },
    {
      field: 'slug',
      headerName: 'Slug',
      width: 180,
      renderCell: (params) => <span className="tnum">{params.row.slug}</span>,
    },
    {
      field: 'productCount',
      headerName: 'Product Count',
      width: 150,
      renderCell: (params) => <span className="tnum">{params.row.productCount} products</span>,
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <StatusSwitch row={params.row} updateCategory={updateCategory} />
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 120,
      sortable: false,
      filterable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: (p) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => handleEditClick(p.row)} sx={{ color: 'var(--ink-500)' }}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => setDeleteCandidate(p.row)} sx={{ color: 'var(--ink-500)' }}>
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Create Category Section */}
      <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 4, border: '1px solid var(--ink-200)' }}>
        <Typography sx={{ fontWeight: 700, fontSize: 16, mb: 0.5 }}>Create Category</Typography>
        <Typography sx={{ fontSize: 12.5, color: 'var(--ink-500)', mb: 2 }}>
          Add a new product category to populate in the dropdown when adding or editing products.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, maxWidth: 500 }}>
          <TextField
            size="small"
            placeholder="Category name (e.g. Beverages)"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            fullWidth
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
          />
          <Button
            variant="contained"
            onClick={handleCreateCategory}
            sx={{ borderRadius: 2.5, px: 3, fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            Create Category
          </Button>
        </Box>
      </Box>

      {/* Categories Grid Table */}
      <TableCard
        title="Product Categories"
        count={filtered.length}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search categories…"
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

      {/* Edit Category Dialog */}
      <Dialog open={Boolean(editCategory)} onClose={() => setEditCategory(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 18, pb: 1 }}>Edit Category</DialogTitle>
        <DialogContent sx={{ pb: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Category Name"
            type="text"
            fullWidth
            variant="outlined"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setEditCategory(null)} variant="outlined" sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button onClick={handleUpdateCategory} variant="contained" sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600 }}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteCandidate)} onClose={() => !deleting && setDeleteCandidate(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 18, pb: 1 }}>Delete Category</DialogTitle>
        <DialogContent sx={{ pb: 2 }}>
          {deleteCandidate && deleteCandidate.productCount > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography sx={{ fontSize: 14 }}>
                Are you sure you want to delete the category <strong>{deleteCandidate.name}</strong>?
              </Typography>
              <Box sx={{ p: 2, bgcolor: '#fff5f5', border: '1px solid #ffccd5', borderRadius: 2.5 }}>
                <Typography sx={{ fontSize: 13, color: '#c53030', fontWeight: 600 }}>
                  ⚠️ Cannot delete category because it contains active products.
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: '#c53030', mt: 0.5 }}>
                  This category currently has <strong>{deleteCandidate.productCount}</strong> products. Please reassign or delete them first.
                </Typography>
              </Box>
            </Box>
          ) : (
            <Typography sx={{ fontSize: 14 }}>
              Are you sure you want to delete the category <strong>{deleteCandidate?.name}</strong>? This action cannot be undone.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDeleteCandidate(null)} disabled={deleting} variant="outlined" sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            disabled={deleting || (deleteCandidate ? deleteCandidate.productCount > 0 : false)}
            variant="contained"
            color="error"
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600 }}
          >
            {deleting ? 'Deleting…' : 'Confirm Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
