import type { ReactNode } from 'react'
import type { SvgIconProps } from '@mui/material'

// Category icons
import GrassRoundedIcon from '@mui/icons-material/GrassRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import BuildRoundedIcon from '@mui/icons-material/BuildRounded'
import CheckroomRoundedIcon from '@mui/icons-material/CheckroomRounded'
import MemoryRoundedIcon from '@mui/icons-material/MemoryRounded'
import KitchenRoundedIcon from '@mui/icons-material/KitchenRounded'
import AgricultureRoundedIcon from '@mui/icons-material/AgricultureRounded'
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded'
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded'
import LocalGroceryStoreRoundedIcon from '@mui/icons-material/LocalGroceryStoreRounded'

// Trust badge icons
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded'
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded'
import Eco from '@mui/icons-material/Spa'
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded'
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded'
import PublicRoundedIcon from '@mui/icons-material/PublicRounded'
import ThumbUpRoundedIcon from '@mui/icons-material/ThumbUpRounded'
import StarRoundedIcon from '@mui/icons-material/StarRounded'

type IconComp = (props: SvgIconProps) => ReactNode

interface IconEntry {
  label: string
  Icon: IconComp
}

/** Curated icon set for storefront categories. Keys are stored on Category.icon. */
export const CATEGORY_ICONS: Record<string, IconEntry> = {
  grass: { label: 'Grass / Agro', Icon: GrassRoundedIcon },
  inventory_2: { label: 'Box / Packaging', Icon: Inventory2RoundedIcon },
  build: { label: 'Tools', Icon: BuildRoundedIcon },
  checkroom: { label: 'Textiles', Icon: CheckroomRoundedIcon },
  memory: { label: 'Electronics', Icon: MemoryRoundedIcon },
  kitchen: { label: 'Home & Kitchen', Icon: KitchenRoundedIcon },
  agriculture: { label: 'Agriculture', Icon: AgricultureRoundedIcon },
  store: { label: 'Storefront', Icon: StorefrontRoundedIcon },
  grocery: { label: 'Grocery', Icon: LocalGroceryStoreRoundedIcon },
  category: { label: 'Generic', Icon: CategoryRoundedIcon },
}

/** Curated icon set for product trust badges. Keys are stored on TrustBadge.icon. */
export const TRUST_ICONS: Record<string, IconEntry> = {
  verified: { label: 'Verified', Icon: VerifiedRoundedIcon },
  shield: { label: 'Shield', Icon: ShieldRoundedIcon },
  eco: { label: 'Eco / Natural', Icon: Eco },
  premium: { label: 'Premium', Icon: WorkspacePremiumRoundedIcon },
  shipping: { label: 'Shipping', Icon: LocalShippingRoundedIcon },
  public: { label: 'Origin / Global', Icon: PublicRoundedIcon },
  thumb_up: { label: 'Trusted', Icon: ThumbUpRoundedIcon },
  star: { label: 'Quality', Icon: StarRoundedIcon },
}

export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS)
export const TRUST_ICON_KEYS = Object.keys(TRUST_ICONS)

/** Render a category icon by key, falling back to a generic icon. */
export function categoryIcon(key: string | undefined, props: SvgIconProps = {}): ReactNode {
  const entry = (key && CATEGORY_ICONS[key]) || CATEGORY_ICONS.category
  const { Icon } = entry
  return <Icon {...props} />
}

/** Render a trust badge icon by key, falling back to the verified icon. */
export function trustIcon(key: string | undefined, props: SvgIconProps = {}): ReactNode {
  const entry = (key && TRUST_ICONS[key]) || TRUST_ICONS.verified
  const { Icon } = entry
  return <Icon {...props} />
}
