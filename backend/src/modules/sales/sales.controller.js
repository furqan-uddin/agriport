import SaleRecord from './saleRecord.model.js';
import IncentiveRecord from './incentiveRecord.model.js';
import User from '../users/user.model.js';
import asyncWrapper from '../../utils/asyncWrapper.js';
import AppError from '../../utils/AppError.js';
import { successResponse } from '../../utils/apiResponse.js';

// Helper for MTD date calculation
const getMTDRanges = () => {
  const now = new Date();
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentEnd = now;

  const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  const prevDay = Math.min(now.getDate(), prevMonthLastDay);
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, prevDay, now.getHours(), now.getMinutes(), now.getSeconds());

  return { currentStart, currentEnd, prevStart, prevEnd };
};

// Helper for delta percentage calculation
const calculateDelta = (currentVal, previousVal) => {
  if (previousVal === 0) {
    return currentVal > 0 ? 100 : 0;
  }
  const delta = ((currentVal - previousVal) / previousVal) * 100;
  return Math.round(delta * 10) / 10;
};

// 1. Get Executive dashboard stats (Executive only)
export const getExecutiveStats = asyncWrapper(async (req, res) => {
  const userId = req.user._id;
  const { currentStart, currentEnd, prevStart, prevEnd } = getMTDRanges();

  // Sum of amount from paid sale records for this executive (Current Month MTD)
  const salesResult = await SaleRecord.aggregate([
    { $match: { executiveId: userId, paymentStatus: 'paid', date: { $gte: currentStart, $lte: currentEnd } } },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$amount' },
        dealsCount: { $sum: 1 },
        totalCommission: { $sum: '$commissionAmount' }
      }
    }
  ]);

  const salesVolume = salesResult[0]?.totalSales || 0;
  const deals = salesResult[0]?.dealsCount || 0;
  const incentiveEarned = salesResult[0]?.totalCommission || 0;

  // Previous Month MTD sales (for delta calculation)
  const prevSalesResult = await SaleRecord.aggregate([
    { $match: { executiveId: userId, paymentStatus: 'paid', date: { $gte: prevStart, $lte: prevEnd } } },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$amount' },
        dealsCount: { $sum: 1 }
      }
    }
  ]);
  const prevSalesVolume = prevSalesResult[0]?.totalSales || 0;
  const prevDeals = prevSalesResult[0]?.dealsCount || 0;

  const revenueDelta = calculateDelta(salesVolume, prevSalesVolume);
  const dealsDelta = calculateDelta(deals, prevDeals);

  // Pending sales
  const pendingResult = await SaleRecord.aggregate([
    { $match: { executiveId: userId, paymentStatus: 'pending' } },
    { $group: { _id: null, totalPending: { $sum: '$amount' } } }
  ]);
  const pending = pendingResult[0]?.totalPending || 0;

  // Executive target
  const target = req.user.target || 150000;

  const commissionSetting = await SystemSetting.findOne({ key: 'sales_commission' });
  const commissionPct = commissionSetting ? commissionSetting.value : 5;

  return successResponse(
    res,
    {
      revenue: salesVolume,
      revenueDelta,
      target,
      deals,
      dealsDelta,
      pending,
      teamSize: 0,
      incentiveEarned,
      commissionPct,
    },
    200,
    'Executive statistics retrieved successfully.'
  );
});

// 2. Get Executive incentive tracking series (Executive only)
export const getIncentiveSeries = asyncWrapper(async (req, res) => {
  const userId = req.user._id;

  const records = await IncentiveRecord.find({ userId }).sort({ month: 1 });

  // If no records, return a fallback monthly breakdown for the charts
  if (records.length === 0) {
    const currentYear = new Date().getFullYear();
    const mockSeries = [
      { label: `${currentYear}-01`, earned: 5000, target: 8000 },
      { label: `${currentYear}-02`, earned: 7500, target: 8000 },
      { label: `${currentYear}-03`, earned: 9200, target: 10000 },
      { label: `${currentYear}-04`, earned: 11000, target: 10000 },
      { label: `${currentYear}-05`, earned: 8500, target: 12000 },
      { label: `${currentYear}-06`, earned: 12500, target: 12000 },
    ];
    return successResponse(res, mockSeries, 200, 'Mock incentive series retrieved.');
  }

  const formattedSeries = records.map(r => ({
    label: r.month,
    earned: r.earnedAmount,
    target: r.targetAmount,
  }));

  return successResponse(res, formattedSeries, 200, 'Incentive series retrieved successfully.');
});

// 3. Get Executive sales records (Executive only)
export const getSalesRecords = asyncWrapper(async (req, res) => {
  const userId = req.user._id;

  const records = await SaleRecord.find({ executiveId: userId }).sort({ date: -1 });

  return successResponse(res, records, 200, 'Sales records retrieved successfully.');
});

// 4. Get Manager dashboard stats (Manager only)
export const getManagerStats = asyncWrapper(async (req, res) => {
  const managerId = req.user._id;
  const { currentStart, currentEnd, prevStart, prevEnd } = getMTDRanges();

  // Sum of amount from paid sale records for this manager's team (Current Month MTD)
  const teamSalesResult = await SaleRecord.aggregate([
    { $match: { managerId, paymentStatus: 'paid', date: { $gte: currentStart, $lte: currentEnd } } },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$amount' },
        dealsCount: { $sum: 1 },
        totalOverrides: { $sum: '$overrideAmount' }
      }
    }
  ]);

  const salesVolume = teamSalesResult[0]?.totalSales || 0;
  const deals = teamSalesResult[0]?.dealsCount || 0;
  const incentiveEarned = teamSalesResult[0]?.totalOverrides || 0;

  // Previous Month MTD sales for manager's team
  const prevTeamSalesResult = await SaleRecord.aggregate([
    { $match: { managerId, paymentStatus: 'paid', date: { $gte: prevStart, $lte: prevEnd } } },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$amount' },
        dealsCount: { $sum: 1 }
      }
    }
  ]);
  const prevSalesVolume = prevTeamSalesResult[0]?.totalSales || 0;
  const prevDeals = prevTeamSalesResult[0]?.dealsCount || 0;

  const revenueDelta = calculateDelta(salesVolume, prevSalesVolume);
  const dealsDelta = calculateDelta(deals, prevDeals);

  // Pending team sales
  const pendingResult = await SaleRecord.aggregate([
    { $match: { managerId, paymentStatus: 'pending' } },
    { $group: { _id: null, totalPending: { $sum: '$amount' } } }
  ]);
  const pending = pendingResult[0]?.totalPending || 0;

  // Count of executives managed
  const teamSize = await User.countDocuments({ managerId, role: 'executive', status: 'active' });

  // Manager target
  const target = req.user.target || 500000;

  return successResponse(
    res,
    {
      revenue: salesVolume,
      revenueDelta,
      target,
      deals,
      dealsDelta,
      pending,
      teamSize,
      incentiveEarned,
    },
    200,
    'Manager statistics retrieved successfully.'
  );
});

// 5. Get Manager's assigned executives team performance (Manager only)
export const getExecutives = asyncWrapper(async (req, res) => {
  const managerId = req.user._id;

  const executives = await User.find({ managerId, role: 'executive' }).sort({ name: 1 });

  const teamPerformance = [];

  for (const exec of executives) {
    const execSales = await SaleRecord.aggregate([
      { $match: { executiveId: exec._id, paymentStatus: 'paid' } },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    teamPerformance.push({
      id: exec._id,
      name: exec.name,
      region: exec.region || req.user.region || 'General',
      sales: execSales[0]?.total || 0,
      target: exec.target || 150000,
      deals: execSales[0]?.count || 0,
      status: exec.status === 'active' ? 'active' : exec.status === 'pending' ? 'pending' : 'inactive',
      joinedOn: exec.createdAt,
    });
  }

  return successResponse(res, teamPerformance, 200, 'Team executives performance retrieved successfully.');
});

// 6. Get Manager's team sales records (Manager only)
export const getManagerSalesRecords = asyncWrapper(async (req, res) => {
  const managerId = req.user._id;

  const records = await SaleRecord.find({ managerId }).sort({ date: -1 });

  return successResponse(res, records, 200, 'Team sales records retrieved successfully.');
});
