import { useDispatch, useSelector } from 'react-redux'
import type { TypedUseSelectorHook } from 'react-redux'
import type { RootState, AppDispatch } from './store'

export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

// Derived cart selectors
export const useCartCount = () => useAppSelector((s) => s.cart.items.length)
export const useCartTotal = () =>
  useAppSelector((s) => s.cart.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0))
