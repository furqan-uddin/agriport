import express from 'express';
import * as storefrontController from './storefront.controller.js';
import authenticate from '../../middlewares/authenticate.js';
import authorize from '../../middlewares/authorize.js';

const router = express.Router();

// Public route
router.get('/', storefrontController.getStorefront);

// Admin-only protected routes
router.put('/hero', authenticate, authorize('admin'), storefrontController.updateHero);
router.post('/banners', authenticate, authorize('admin'), storefrontController.addBanner);
router.put('/banners/:id', authenticate, authorize('admin'), storefrontController.updateBanner);
router.delete('/banners/:id', authenticate, authorize('admin'), storefrontController.deleteBanner);
router.put('/trust-badges', authenticate, authorize('admin'), storefrontController.updateTrustBadges);

export default router;
