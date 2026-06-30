import express from 'express';
import * as notificationController from './notification.controller.js';
import authenticate from '../../middlewares/authenticate.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/stream', notificationController.streamNotifications);
router.get('/', notificationController.getNotifications);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);

export default router;
