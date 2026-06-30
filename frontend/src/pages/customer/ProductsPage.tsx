import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Box,
  Typography,
  MenuItem,
  TextField,
  FormControlLabel,
  Switch,
  Chip,
} from '@mui/material'
import PageHeader from '@/components/common/PageHeader'
import ProductCard from '@/components/product/ProductCard'
import EmptyState from '@/components/common/EmptyState'
import { CardGridSkeleton } from '@/components/common/Loader'
import { useGetProductsQuery } from '@/redux/api'
import type { ProductQuery } from '@/redux/api'
import { ROUTES } from '@/constants'

type SortKey = NonNullable<ProductQuery['sort']>

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'rating', label: 'Top rated' },
]

export default function ProductsPage() {
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const category = params.get('category') ?? 'all'
  const sort = (params.get('sort') as SortKey) ?? 'relevance'
  const inStockOnly = params.get('inStock') === '1'

  const query: ProductQuery = useMemo(
    () => ({ search, category, sort, inStockOnly }),
    [search, category, sort, inStockOnly],
  )
  const { data: products, isLoading, isFetching } = useGetProductsQuery(query)

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === '' || v === 'all') next.delete(k)
      else next.set(k, v)
    })
    setParams(next, { replace: true })
  }

  const activeFilters =
    (search ? 1 : 0) + (category !== 'all' ? 1 : 0) + (inStockOnly ? 1 : 0)

  return (
    <Box className="animate-fade-up">
      <PageHeader
        title="Marketplace"
        subtitle="Browse wholesale products with quantity-based lot pricing."
        crumbs={[{ label: 'Home', to: ROUTES.home }, { label: 'Marketplace' }]}
      />

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
          p: 2,
          borderRadius: 3,
          border: '1px solid var(--ink-200)',
          backgroundColor: '#fff',
        }}
      >
        <FormControlLabel
          control={<Switch checked={inStockOnly} onChange={(e) => update({ inStock: e.target.checked ? '1' : null })} />}
          label={<Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>In stock only</Typography>}
        />
        <TextField
          select
          size="small"
          value={sort}
          onChange={(e) => update({ sort: e.target.value })}
          sx={{ minWidth: 190 }}
        >
          {SORTS.map((s) => (
            <MenuItem key={s.value} value={s.value}>
              {s.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {/* Result meta */}
      <Box className="flex items-center gap-2 mb-4">
        <Typography sx={{ fontSize: 14, color: 'var(--ink-500)' }}>
          {isFetching ? 'Loading…' : `${products?.length ?? 0} products`}
        </Typography>
        {search && (
          <Chip size="small" label={`Search: ${search}`} onDelete={() => update({ search: null })} />
        )}
        {activeFilters > 0 && (
          <Chip
            size="small"
            variant="outlined"
            label="Clear all"
            onClick={() => setParams(new URLSearchParams(), { replace: true })}
          />
        )}
      </Box>

      {isLoading ? (
        <CardGridSkeleton count={6} />
      ) : products && products.length > 0 ? (
        <Box className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </Box>
      ) : (
        <EmptyState
          title="No products match your filters"
          description="Try adjusting your search or clearing the filters to see more results."
          actionLabel="Clear filters"
          onAction={() => setParams(new URLSearchParams(), { replace: true })}
        />
      )}
    </Box>
  )
}
