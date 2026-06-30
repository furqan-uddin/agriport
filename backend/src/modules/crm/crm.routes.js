import express from 'express';
import * as crmController from './crm.controller.js';
import authenticate from '../../middlewares/authenticate.js';
import authorize from '../../middlewares/authorize.js';

const router = express.Router();

// All CRM routes require authentication and staff authorization
router.use(authenticate);
router.use(authorize('executive', 'admin', 'manager'));

// Customer CRM
router.get('/customers', crmController.getCrmCustomers);
router.post('/customers', crmController.createCrmCustomer);
router.patch('/customers/:id', crmController.updateCrmCustomer);

// Follow-ups
router.get('/follow-ups', crmController.getFollowUps);
router.post('/follow-ups', crmController.createFollowUp);
router.patch('/follow-ups/:id', crmController.updateFollowUp);
router.delete('/follow-ups/:id', crmController.deleteFollowUp);

export default router;
