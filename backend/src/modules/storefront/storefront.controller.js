import Storefront from './storefront.model.js';
import asyncWrapper from '../../utils/asyncWrapper.js';
import AppError from '../../utils/AppError.js';
import { successResponse } from '../../utils/apiResponse.js';

// Helper to get or create the singleton storefront document
const getStorefrontDocument = async () => {
  let doc = await Storefront.findOne();
  if (!doc) {
    doc = await Storefront.create({});
  }
  return doc;
};

// 1. Get storefront content (Public)
export const getStorefront = asyncWrapper(async (req, res) => {
  const doc = await getStorefrontDocument();
  return successResponse(res, doc, 200, 'Storefront content retrieved successfully.');
});

// 2. Update storefront Hero block (Admin only)
export const updateHero = asyncWrapper(async (req, res, next) => {
  const { badge, titleLine1, titleLine2, subtitle, primaryCtaLabel, primaryCtaTo, secondaryCtaLabel, secondaryCtaTo } = req.body;

  const doc = await getStorefrontDocument();

  if (badge) doc.hero.badge = badge;
  if (titleLine1) doc.hero.titleLine1 = titleLine1;
  if (titleLine2) doc.hero.titleLine2 = titleLine2;
  if (subtitle) doc.hero.subtitle = subtitle;
  if (primaryCtaLabel) doc.hero.primaryCtaLabel = primaryCtaLabel;
  if (primaryCtaTo) doc.hero.primaryCtaTo = primaryCtaTo;
  if (secondaryCtaLabel) doc.hero.secondaryCtaLabel = secondaryCtaLabel;
  if (secondaryCtaTo) doc.hero.secondaryCtaTo = secondaryCtaTo;

  await doc.save();
  return successResponse(res, doc, 200, 'Storefront hero updated successfully.');
});

// 3. Add promotional banner (Admin only)
export const addBanner = asyncWrapper(async (req, res, next) => {
  const { title, subtitle, cta, accent } = req.body;

  if (!title || !subtitle || !cta || !accent) {
    return next(new AppError('All banner fields (title, subtitle, cta, accent) are required.', 400));
  }

  const doc = await getStorefrontDocument();

  const id = `${Date.now()}-${Math.round(Math.random() * 1e5)}`;
  doc.banners.push({ id, title, subtitle, cta, accent });

  await doc.save();
  return successResponse(res, doc, 201, 'Storefront banner added successfully.');
});

// 4. Update promotional banner (Admin only)
export const updateBanner = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { title, subtitle, cta, accent } = req.body;

  const doc = await getStorefrontDocument();
  const banner = doc.banners.find((b) => b.id === id);

  if (!banner) {
    return next(new AppError('Banner not found.', 404));
  }

  if (title) banner.title = title;
  if (subtitle) banner.subtitle = subtitle;
  if (cta) banner.cta = cta;
  if (accent) banner.accent = accent;

  await doc.save();
  return successResponse(res, doc, 200, 'Storefront banner updated successfully.');
});

// 5. Delete promotional banner (Admin only)
export const deleteBanner = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const doc = await getStorefrontDocument();
  const initialLength = doc.banners.length;
  doc.banners = doc.banners.filter((b) => b.id !== id);

  if (doc.banners.length === initialLength) {
    return next(new AppError('Banner not found.', 404));
  }

  await doc.save();
  return successResponse(res, doc, 200, 'Storefront banner deleted successfully.');
});

// 6. Update storefront Trust Badges (Admin only)
export const updateTrustBadges = asyncWrapper(async (req, res, next) => {
  const { trustBadges } = req.body;

  if (!Array.isArray(trustBadges)) {
    return next(new AppError('trustBadges must be an array.', 400));
  }

  const doc = await getStorefrontDocument();
  doc.trustBadges = trustBadges;
  await doc.save();

  return successResponse(res, doc, 200, 'Storefront trust badges updated successfully.');
});
