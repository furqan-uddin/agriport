import mongoose from 'mongoose';

const heroSchema = new mongoose.Schema(
  {
    badge: { type: String, default: 'Direct Farm Sourcing' },
    titleLine1: { type: String, default: 'Premium Quality' },
    titleLine2: { type: String, default: 'Agricultural Commodities' },
    subtitle: { type: String, default: 'Connecting verified B2B buyers directly with farming clusters. Transparent lot-pricing with optimized logistics.' },
    primaryCtaLabel: { type: String, default: 'Explore Commodities' },
    primaryCtaTo: { type: String, default: '/marketplace' },
    secondaryCtaLabel: { type: String, default: 'Register Business' },
    secondaryCtaTo: { type: String, default: '/signup' },
  },
  { _id: false }
);

const bannerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
    cta: { type: String, required: true },
    accent: { type: String, required: true },
  },
  { _id: false }
);

const trustBadgeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    icon: { type: String, required: true },
    label: { type: String, required: true },
  },
  { _id: false }
);

const storefrontSchema = new mongoose.Schema(
  {
    hero: {
      type: heroSchema,
      default: () => ({}),
    },
    banners: {
      type: [bannerSchema],
      default: () => [
        {
          id: '1',
          title: 'Premium Punjab Wheat',
          subtitle: 'Grade A organic harvest. Available for immediate lot shipment.',
          cta: 'Source Lot',
          accent: 'amber',
        },
        {
          id: '2',
          title: 'Basmati Rice Lot',
          subtitle: 'Long grain, moisture-controlled exports. Bulk discount tiers.',
          cta: 'View Slab Pricing',
          accent: 'emerald',
        },
      ],
    },
    trustBadges: {
      type: [trustBadgeSchema],
      default: () => [
        { id: '1', icon: 'ShieldCheck', label: '100% Quality Inspected' },
        { id: '2', icon: 'LocalShipping', label: 'Optimized Cold Chain' },
        { id: '3', icon: 'VerifiedUser', label: 'Admin Verified Sellers' },
      ],
    },
  },
  {
    timestamps: true,
  }
);

const Storefront = mongoose.model('Storefront', storefrontSchema);

export default Storefront;
