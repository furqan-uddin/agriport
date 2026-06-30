import CRMCustomer from './crmCustomer.model.js';
import FollowUp from './followUp.model.js';
import User from '../users/user.model.js';
import asyncWrapper from '../../utils/asyncWrapper.js';
import AppError from '../../utils/AppError.js';
import { successResponse } from '../../utils/apiResponse.js';

// 1. Get CRM customers for an executive
export const getCrmCustomers = asyncWrapper(async (req, res) => {
  const { stage, search } = req.query;

  // Sync: Ensure all registered platform customers have a corresponding CRMCustomer record
  try {
    const allCrmUsers = await CRMCustomer.find({ platformUserId: { $ne: null } }).distinct('platformUserId');
    const missingUsers = await User.find({ role: 'customer', status: 'active', _id: { $nin: allCrmUsers } });
    
    for (const user of missingUsers) {
      const linked = await CRMCustomer.findOneAndUpdate(
        { phone: user.mobile, platformUserId: null },
        { platformUserId: user._id },
        { new: true }
      );
      if (!linked) {
        await CRMCustomer.create({
          name: user.name,
          company: user.companyName || '',
          phone: user.mobile || '',
          city: user.city || '',
          gst: user.gstNumber || '',
          stage: 'lead',
          totalValue: 0,
          lastContactAt: null,
          platformUserId: user._id,
        });
      }
    }
  } catch (syncErr) {
    // Suppress synchronization error to not break page rendering in case of DB glitch
    console.error('Error syncing platform customers to CRM:', syncErr);
  }

  // Only display CRM Customers that either have no platform account (manual lead) OR have an active platform account
  const activeUserIds = await User.find({ role: 'customer', status: 'active' }).distinct('_id');

  const queryObj = {
    $and: [
      {
        $or: [
          { platformUserId: null },
          { platformUserId: { $in: activeUserIds } }
        ]
      }
    ]
  };

  if (stage) {
    queryObj.$and.push({ stage });
  }

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    queryObj.$and.push({
      $or: [
        { name: searchRegex },
        { company: searchRegex },
        { phone: searchRegex },
      ]
    });
  }

  const customers = await CRMCustomer.find(queryObj).sort({ createdAt: -1 });

  return successResponse(res, customers, 200, 'CRM customers retrieved successfully.');
});

// 2. Create a new CRM customer
export const createCrmCustomer = asyncWrapper(async (req, res, next) => {
  const { name, company, phone, city, gst } = req.body;

  if (!name) {
    return next(new AppError('Customer name is required.', 400));
  }

  // Find if matching customer platform account exists
  let platformUserId = null;
  if (phone) {
    const user = await User.findOne({ mobile: phone.trim(), role: 'customer' });
    if (user) {
      platformUserId = user._id;
    }
  }

  const customer = await CRMCustomer.create({
    ownerId: req.user._id,
    name,
    company: company || '',
    phone: phone || '',
    city: city || '',
    gst: gst || '',
    stage: 'lead',
    totalValue: 0,
    lastContactAt: null,
    platformUserId,
  });

  return successResponse(res, customer, 201, 'CRM customer created successfully.');
});

// 3. Update a CRM customer's stage or details
export const updateCrmCustomer = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { stage, company, phone, city, gst, totalValue, lastContactAt } = req.body;

  const customer = await CRMCustomer.findById(id);
  if (!customer) {
    return next(new AppError('CRM customer not found.', 404));
  }

  if (stage) customer.stage = stage;
  if (company !== undefined) customer.company = company;
  if (phone !== undefined) customer.phone = phone;
  if (city !== undefined) customer.city = city;
  if (gst !== undefined) customer.gst = gst;
  if (totalValue !== undefined) customer.totalValue = Number(totalValue) || 0;
  if (lastContactAt !== undefined) customer.lastContactAt = lastContactAt ? new Date(lastContactAt) : null;

  await customer.save();

  return successResponse(res, customer, 200, 'CRM customer updated successfully.');
});

// 4. Get follow-up tasks for an executive
export const getFollowUps = asyncWrapper(async (req, res) => {
  const { isDone } = req.query;

  const queryObj = { executiveId: req.user._id };

  if (isDone !== undefined) {
    queryObj.isDone = isDone === 'true' || isDone === true;
  }

  const followUps = await FollowUp.find(queryObj).sort({ dueAt: 1 });

  return successResponse(res, followUps, 200, 'Follow-up tasks retrieved successfully.');
});

// 5. Create a new follow-up task
export const createFollowUp = asyncWrapper(async (req, res, next) => {
  const { crmCustomerId, dueAt, type, note } = req.body;

  if (!crmCustomerId || !dueAt || !type) {
    return next(new AppError('CRM Customer ID, due date, and follow-up type are required.', 400));
  }

  const customer = await CRMCustomer.findById(crmCustomerId);
  if (!customer) {
    return next(new AppError('CRM customer not found.', 404));
  }

  const followUp = await FollowUp.create({
    executiveId: req.user._id,
    crmCustomerId,
    customer: customer.name,
    company: customer.company || '',
    dueAt: new Date(dueAt),
    type,
    note: note || '',
    isDone: false,
  });

  // Update customer's last contact timestamp
  customer.lastContactAt = new Date();
  await customer.save();

  return successResponse(res, followUp, 201, 'Follow-up task scheduled successfully.');
});

// 6. Complete or update a follow-up task
export const updateFollowUp = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { isDone, note } = req.body;

  const followUp = await FollowUp.findOne({ _id: id, executiveId: req.user._id });
  if (!followUp) {
    return next(new AppError('Follow-up task not found or unauthorized.', 404));
  }

  if (note !== undefined) followUp.note = note;
  
  if (isDone !== undefined) {
    const isDoneBool = isDone === 'true' || isDone === true;
    followUp.isDone = isDoneBool;
    followUp.completedAt = isDoneBool ? new Date() : null;

    if (isDoneBool) {
      // Also update the associated customer's last contact time
      const customer = await CRMCustomer.findById(followUp.crmCustomerId);
      if (customer) {
        customer.lastContactAt = new Date();
        await customer.save();
      }
    }
  }

  await followUp.save();

  return successResponse(res, followUp, 200, 'Follow-up task updated successfully.');
});

// 7. Delete a follow-up task
export const deleteFollowUp = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const followUp = await FollowUp.findOneAndDelete({ _id: id, executiveId: req.user._id });
  if (!followUp) {
    return next(new AppError('Follow-up task not found or unauthorized.', 404));
  }

  return successResponse(res, null, 200, 'Follow-up task deleted successfully.');
});
