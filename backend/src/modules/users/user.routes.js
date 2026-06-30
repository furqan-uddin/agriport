import express from 'express';
import * as userController from './user.controller.js';
import authenticate from '../../middlewares/authenticate.js';
import authorize from '../../middlewares/authorize.js';
import handleUploads from '../../middlewares/upload.js';

const router = express.Router();

// Protect all routes with authentication
router.use(authenticate);

// Profile and document upload routes (accessible to any logged-in user)
router.get('/me', userController.getProfile);
router.patch('/me', userController.updateProfile);
router.get('/me/documents', userController.getDocuments);
router.post(
  '/me/documents',
  handleUploads([{ name: 'file', maxCount: 1 }]),
  userController.uploadDocument
);

// Protect subsequent routes with admin-only authorization
router.use(authorize('admin'));

router.get('/admin/list', userController.getAdminUsers);
router.patch('/admin/:id/status', userController.updateUserStatus);
router.patch('/admin/:id/kyc', userController.verifyUserKyc);
router.get('/admin/:id/documents', userController.getAdminUserDocuments);

// Sales team onboarding routes
router.get('/admin/sales/managers', userController.getManagers);
router.post('/admin/sales/managers', userController.createManager);
router.get('/admin/sales/executive-approvals', userController.getExecutiveApprovals);
router.patch('/admin/sales/executive-approvals/:id', userController.approveExecutive);
router.get('/admin/sales/settings', userController.getSalesSettings);
router.post('/admin/sales/settings', userController.updateSalesSettings);
router.get('/admin/sales/executives', userController.getAdminExecutives);
router.patch('/admin/sales/executives/:id/assign-manager', userController.assignManager);
router.patch('/admin/sales/users/:id/target', userController.updateUserTarget);

export default router;

