import logger from '../config/logger.js';
import User from '../modules/users/user.model.js';
import Product from '../modules/products/product.model.js';
import SaleRecord from '../modules/sales/saleRecord.model.js';
import IncentiveRecord from '../modules/sales/incentiveRecord.model.js';
import SystemSetting from '../modules/sales/systemSetting.model.js';
import { Agenda } from 'agenda';
import env from '../config/env.js';

// 1. Core Incentive calculator function (can be called manually or scheduled)
export const calculateMonthlyIncentives = async (monthStr) => {
  logger.info(`[JobManager] Starting monthly incentive calculation for: ${monthStr}`);

  // Fetch dynamic settings or fallback to default rates
  const commissionSetting = await SystemSetting.findOne({ key: 'sales_commission' });
  const overrideSetting = await SystemSetting.findOne({ key: 'manager_override' });
  const commRate = commissionSetting ? commissionSetting.value : 5;
  const overRate = overrideSetting ? overrideSetting.value : 2;

  // Find all executives and managers
  const salesTeam = await User.find({ role: { $in: ['executive', 'manager'] } });

  for (const staff of salesTeam) {
    const startOfMonth = new Date(`${monthStr}-01T00:00:00.000Z`);
    const endOfMonth = new Date(new Date(startOfMonth).setMonth(startOfMonth.getMonth() + 1));

    let salesVolume = 0;
    let teamSalesVolume = 0;
    let earnedAmount = 0;

    if (staff.role === 'executive') {
      const records = await SaleRecord.aggregate([
        {
          $match: {
            executiveId: staff._id,
            paymentStatus: 'paid',
            date: { $gte: startOfMonth, $lt: endOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            totalVolume: { $sum: '$amount' },
            totalCommission: { $sum: '$commissionAmount' }
          }
        }
      ]);
      salesVolume = records[0]?.totalVolume || 0;
      earnedAmount = records[0]?.totalCommission || 0;
    } else if (staff.role === 'manager') {
      const records = await SaleRecord.aggregate([
        {
          $match: {
            managerId: staff._id,
            paymentStatus: 'paid',
            date: { $gte: startOfMonth, $lt: endOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            totalVolume: { $sum: '$amount' },
            totalOverrides: { $sum: '$overrideAmount' }
          }
        }
      ]);
      teamSalesVolume = records[0]?.totalVolume || 0;
      earnedAmount = records[0]?.totalOverrides || 0;
    }

    // Target targetAmount
    const targetAmount = staff.target || (staff.role === 'manager' ? 500000 : 150000);

    // Upsert the incentive record for this user and month
    await IncentiveRecord.findOneAndUpdate(
      { userId: staff._id, month: monthStr },
      {
        role: staff.role,
        earnedAmount,
        targetAmount,
        commissionRate: staff.role === 'executive' ? commRate : 0,
        overrideRate: staff.role === 'manager' ? overRate : 0,
        salesVolume,
        teamSalesVolume,
      },
      { upsert: true, new: true }
    );
  }

  logger.info(`[JobManager] Incentive calculation completed for: ${monthStr}`);
};

// 2. Product stock level auditor
export const auditProductStockLevels = async () => {
  logger.info('[JobManager] Running daily product stock audit...');
  const lowStockProducts = await Product.find({
    stock: { $lt: 10 },
    isArchived: { $ne: true },
  });

  if (lowStockProducts.length > 0) {
    logger.warn(`[JobManager] ALERT: ${lowStockProducts.length} product(s) are low on stock:`);
    lowStockProducts.forEach(p => {
      logger.warn(` - SKU: ${p.sku}, Name: ${p.name}, Available Stock: ${p.stock}`);
    });
  } else {
    logger.info('[JobManager] Daily product stock audit passed. No low stock items.');
  }
};

let agenda;

// Start background timers using Agenda
export const startBackgroundJobs = async () => {
  logger.info('🚀 Background jobs scheduler initialized.');
  try {
    agenda = new Agenda({
      db: { address: env.MONGO_URI, collection: 'agendaJobs' }
    });

    // Define Stock Level Audit Job
    agenda.define('audit stock levels', async (job) => {
      try {
        await auditProductStockLevels();
      } catch (err) {
        logger.error('[JobManager] Agenda stock audit job encountered an error:', err);
      }
    });

    // Define Incentive Calculator Job
    agenda.define('calculate monthly incentives', async (job) => {
      try {
        const now = new Date();
        const lastMonthDate = new Date(now.setMonth(now.getMonth() - 1));
        const monthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
        await calculateMonthlyIncentives(monthStr);
      } catch (err) {
        logger.error('[JobManager] Agenda monthly incentives calculation job encountered an error:', err);
      }
    });

    // Start Agenda
    await agenda.start();

    // Schedule recurring jobs
    // 1. Audit stock levels: daily at midnight (0 0 * * *)
    await agenda.every('0 0 * * *', 'audit stock levels');

    // 2. Calculate monthly incentives: monthly on the 1st of the month at 00:05 AM (5 0 1 * *)
    await agenda.every('5 0 1 * *', 'calculate monthly incentives');

    logger.info('✅ Agenda scheduler started and recurring jobs successfully registered.');
  } catch (err) {
    logger.error('❌ Failed to start Agenda background jobs:', err);
  }
};

// Gracefully stop background timers
export const stopBackgroundJobs = async () => {
  if (agenda) {
    logger.info('Stopping Agenda background jobs scheduler...');
    try {
      await agenda.stop();
      logger.info('✅ Agenda background jobs scheduler stopped gracefully.');
    } catch (err) {
      logger.error('Error stopping Agenda background jobs scheduler:', err);
    }
  }
};
