import mongoose from 'mongoose';
import Transaction from './transaction.model.js';
import Order from '../orders/order.model.js';
import SaleRecord from '../sales/saleRecord.model.js';
import SystemSetting from '../sales/systemSetting.model.js';
import User from '../users/user.model.js';
import eventBus from '../../events/index.js';
import { paginate } from '../../utils/paginate.js';
import asyncWrapper from '../../utils/asyncWrapper.js';
import AppError from '../../utils/AppError.js';
import { successResponse } from '../../utils/apiResponse.js';

// 1. Get customer's transaction history
export const getTransactions = asyncWrapper(async (req, res) => {
  const queryObj = { customerId: req.user._id };

  const result = await paginate(Transaction, queryObj, req.query, {
    sort: { createdAt: -1 }
  });

  return successResponse(
    res,
    {
      transactions: result.docs,
      pagination: result.pagination,
    },
    200,
    'Transactions retrieved successfully.'
  );
});

// 2. Verify offline payment (Admin only)
export const verifyOfflinePayment = asyncWrapper(async (req, res, next) => {
  const { transactionId } = req.params;

  let transaction = null;
  if (mongoose.Types.ObjectId.isValid(transactionId)) {
    transaction = await Transaction.findById(transactionId);
  }
  if (!transaction) {
    transaction = await Transaction.findOne({ orderId: transactionId });
  }

  if (!transaction) {
    return next(new AppError('Transaction not found.', 404));
  }

  if (transaction.status === 'paid') {
    return next(new AppError('Transaction has already been verified and paid.', 400));
  }

  transaction.status = 'paid';
  transaction.verifiedBy = req.user._id;
  transaction.verifiedAt = new Date();
  await transaction.save();

  // Update payment status on associated order
  const order = await Order.findById(transaction.orderId);
  if (order) {
    order.paymentStatus = 'paid';

    // Auto-confirm order if it is in placed state
    if (order.status === 'placed') {
      order.status = 'confirmed';
      const timelineConfirm = order.trackingTimeline.find((t) => t.label === 'Confirmed');
      if (timelineConfirm) {
        timelineConfirm.at = new Date();
        timelineConfirm.done = true;
      }
    }
    await order.save();

    // Check if sales records already exist for this order to prevent duplicates
    const recordsExist = await SaleRecord.exists({ orderId: order._id });
    if (!recordsExist) {
      const commissionSetting = await SystemSetting.findOne({ key: 'sales_commission' });
      const overrideSetting = await SystemSetting.findOne({ key: 'manager_override' });
      const commRate = commissionSetting ? commissionSetting.value / 100 : 0.05;
      const overRate = overrideSetting ? overrideSetting.value / 100 : 0.02;

      for (const line of order.lines) {
        let executiveId = order.executiveId;
        let managerId = null;

        if (!executiveId) {
          // Check if customer user has an assigned manager/executive
          const custUser = await User.findById(order.customerId);
          if (custUser && custUser.managerId) {
            const assignedUser = await User.findById(custUser.managerId);
            if (assignedUser) {
              if (assignedUser.role === 'executive') {
                executiveId = assignedUser._id;
                managerId = assignedUser.managerId;
              } else if (assignedUser.role === 'manager') {
                managerId = assignedUser._id;
              }
            }
          }
        } else {
          // Executive is assigned directly to the order, find their manager
          const execUser = await User.findById(executiveId);
          if (execUser) {
            managerId = execUser.managerId;
          }
        }

        // Calculate commissions (using dynamic rates)
        const commissionAmount = executiveId ? Math.round(line.lineTotal * commRate * 100) / 100 : 0;
        const overrideAmount = managerId ? Math.round(line.lineTotal * overRate * 100) / 100 : 0;

        await SaleRecord.create({
          orderId: order._id,
          executiveId: executiveId || order.customerId, // fallback to customerId if no staff
          managerId,
          customerId: order.customerId,
          customer: order.customerName || '',
          product: line.name || '',
          quantity: line.quantity,
          unit: line.unit,
          amount: line.lineTotal,
          date: new Date(),
          paymentStatus: 'paid',
          commissionAmount,
          overrideAmount,
        });
      }
    }

    // Emit payment.verified event asynchronously
    eventBus.emit('payment.verified', { order, transaction });
  }

  return successResponse(res, transaction, 200, 'Offline payment transaction verified successfully.');
});
