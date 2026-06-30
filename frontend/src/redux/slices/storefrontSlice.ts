import { createSlice, nanoid } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { Banner, Category, HeroContent, TrustBadge } from '@/types'
import { banners as mockBanners, categories as mockCategories } from '@/mocks/data'

export interface StorefrontState {
  hero: HeroContent
  banners: Banner[]
  categories: Category[]
  trustBadges: TrustBadge[]
}

const STORAGE_KEY = 'agriport_storefront'

const defaultHero: HeroContent = {
  badge: 'WHOLESALE B2B MARKETPLACE',
  titleLine1: 'Source smarter.',
  titleLine2: 'Buy in bulk, pay less.',
  subtitle:
    'Lot-based wholesale pricing across agro commodities, packaging, tools and more — with verified suppliers and transparent dispatch.',
  primaryCtaLabel: 'Browse marketplace',
  primaryCtaTo: '/products',
  secondaryCtaLabel: "Today's bulk deals",
  secondaryCtaTo: '/products?sort=price_asc',
}

const defaultTrustBadges: TrustBadge[] = [{ id: 'tb1', icon: 'verified', label: 'Verified supplier' }]

function defaultState(): StorefrontState {
  return {
    hero: defaultHero,
    // Clone the mock arrays so edits never mutate the source mocks.
    banners: mockBanners.map((b) => ({ ...b })),
    categories: mockCategories.map((c) => ({ ...c })),
    trustBadges: defaultTrustBadges.map((t) => ({ ...t })),
  }
}

/** Load persisted storefront content from localStorage, falling back to defaults. */
function loadState(): StorefrontState {
  const fallback = defaultState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<StorefrontState>
    return {
      hero: { ...fallback.hero, ...parsed.hero },
      banners: parsed.banners ?? fallback.banners,
      categories: parsed.categories ?? fallback.categories,
      trustBadges: parsed.trustBadges ?? fallback.trustBadges,
    }
  } catch {
    return fallback
  }
}

const storefrontSlice = createSlice({
  name: 'storefront',
  initialState: loadState(),
  reducers: {
    setStorefront: (state, action: PayloadAction<Partial<StorefrontState>>) => {
      if (action.payload.hero) state.hero = action.payload.hero
      if (action.payload.banners) state.banners = action.payload.banners
      if (action.payload.trustBadges) state.trustBadges = action.payload.trustBadges
    },

    // ── Hero ───────────────────────────────────────────────────────────────
    updateHero: (state, action: PayloadAction<Partial<HeroContent>>) => {
      state.hero = { ...state.hero, ...action.payload }
    },

    // ── Promotional banners ──────────────────────────────────────────────────
    addBanner: (state) => {
      state.banners.push({
        id: nanoid(6),
        title: 'New Promotion',
        subtitle: 'Describe your offer here',
        cta: 'Shop now',
        accent: 'brand',
      })
    },
    updateBanner: (state, action: PayloadAction<{ id: string; patch: Partial<Banner> }>) => {
      const b = state.banners.find((x) => x.id === action.payload.id)
      if (b) Object.assign(b, action.payload.patch)
    },
    removeBanner: (state, action: PayloadAction<string>) => {
      state.banners = state.banners.filter((b) => b.id !== action.payload)
    },

    // ── Trust badges ─────────────────────────────────────────────────────────
    addTrustBadge: (state) => {
      state.trustBadges.push({ id: nanoid(6), icon: 'shield', label: 'New badge' })
    },
    updateTrustBadge: (state, action: PayloadAction<{ id: string; patch: Partial<TrustBadge> }>) => {
      const t = state.trustBadges.find((x) => x.id === action.payload.id)
      if (t) Object.assign(t, action.payload.patch)
    },
    removeTrustBadge: (state, action: PayloadAction<string>) => {
      state.trustBadges = state.trustBadges.filter((t) => t.id !== action.payload)
    },

    // Reset everything back to the original defaults.
    resetStorefront: () => defaultState(),
  },
})

export const {
  setStorefront,
  updateHero,
  addBanner,
  updateBanner,
  removeBanner,
  addTrustBadge,
  updateTrustBadge,
  removeTrustBadge,
  resetStorefront,
} = storefrontSlice.actions

export const STOREFRONT_STORAGE_KEY = STORAGE_KEY
export default storefrontSlice.reducer
