import type { PricingSlab } from '@/types'

/** Resolve the per-unit price for a given quantity from a product's pricing slabs. */
export function resolveUnitPrice(slabs: PricingSlab[], qty: number): PricingSlab {
  if (!slabs || slabs.length === 0) {
    return { minQty: 1, maxQty: null, price: 0, label: 'Enquiry pricing' }
  }
  const match = slabs.find((s) => qty >= s.minQty && (s.maxQty === null || qty <= s.maxQty))
  return match ?? slabs[0] ?? { minQty: 1, maxQty: null, price: 0, label: 'Enquiry pricing' }
}

/** Generate the standard 4-tier wholesale slab ladder from a base price. */
export function generateSlabs(base: number): PricingSlab[] {
  return [
    { minQty: 1, maxQty: 10, price: base, label: '1–10 units' },
    { minQty: 11, maxQty: 50, price: Math.round(base * 0.92), label: '11–50 units' },
    { minQty: 51, maxQty: 200, price: Math.round(base * 0.85), label: '51–200 units' },
    { minQty: 201, maxQty: null, price: Math.round(base * 0.78), label: '201+ units (bulk)' },
  ]
}

/** Savings vs. the base (smallest-quantity) slab, in percent. */
export function slabSavingsPct(slabs: PricingSlab[], qty: number): number {
  if (!slabs || slabs.length === 0) return 0
  const base = slabs[0].price
  const current = resolveUnitPrice(slabs, qty).price
  if (base === 0) return 0
  return Math.round(((base - current) / base) * 100)
}
