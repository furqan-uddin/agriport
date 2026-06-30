import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { CartItem, Product } from '@/types'
import { resolveUnitPrice } from '@/utils/pricing'

interface CartState {
  items: CartItem[]
}

const initialState: CartState = { items: [] }

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<{ product: Product; quantity: number }>) => {
      const { product, quantity } = action.payload
      const existing = state.items.find((i) => i.productId === product.id)
      const qty = Math.max(quantity, product.moq)
      if (existing) {
        existing.quantity = qty
        existing.unitPrice = resolveUnitPrice(product.pricingSlabs, qty).price
      } else {
        state.items.push({
          productId: product.id,
          name: product.name,
          image: product.images[0] ?? '',
          unit: product.unit,
          quantity: qty,
          unitPrice: resolveUnitPrice(product.pricingSlabs, qty).price,
          moq: product.moq,
          specifications: product.specifications,
        })
      }
    },
    setQuantity: (
      state,
      action: PayloadAction<{ productId: string; quantity: number; slabs?: Product['pricingSlabs'] }>,
    ) => {
      const item = state.items.find((i) => i.productId === action.payload.productId)
      if (item) {
        item.quantity = Math.max(action.payload.quantity, item.moq)
        if (action.payload.slabs) {
          item.unitPrice = resolveUnitPrice(action.payload.slabs, item.quantity).price
        }
      }
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((i) => i.productId !== action.payload)
    },
    clearCart: (state) => {
      state.items = []
    },
  },
})

export const { addToCart, setQuantity, removeFromCart, clearCart } = cartSlice.actions
export default cartSlice.reducer
