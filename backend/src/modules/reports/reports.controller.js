import Order from '../orders/order.model.js';
import Transaction from '../payments/transaction.model.js';
import User from '../users/user.model.js';
import Product from '../products/product.model.js';
import Category from '../categories/category.model.js';
import VendorPurchase from '../inventory/vendorPurchase.model.js';
import StockRequest from '../inventory/stockRequest.model.js';
import asyncWrapper from '../../utils/asyncWrapper.js';
import AppError from '../../utils/AppError.js';
import { successResponse } from '../../utils/apiResponse.js';

// Helper to convert arrays to CSV content
const convertToCSV = (headers, rows) => {
  const csvRows = [headers.join(',')];
  for (const row of rows) {
    const values = row.map(val => {
      if (val === undefined || val === null) return '';
      // Escape double quotes
      const stringVal = String(val).replace(/"/g, '""');
      return `"${stringVal}"`;
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
};

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

// 1. Get KPI stats for admin dashboard (Admin/Manager only)
export const getDashboardStats = asyncWrapper(async (req, res) => {
  // Aggregate total revenue
  const totalRevenueResult = await Transaction.aggregate([
    { $match: { status: 'paid' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const totalRevenue = totalRevenueResult[0]?.total || 0;

  // Aggregate total product stock
  const productStockResult = await Product.aggregate([
    { $match: { isArchived: { $ne: true } } },
    { $group: { _id: null, total: { $sum: '$stock' } } }
  ]);
  const productStock = productStockResult[0]?.total || 0;

  // Aggregate pending payments amount
  const pendingPaymentsAmountResult = await Transaction.aggregate([
    { $match: { status: 'pending' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const pendingPaymentsAmount = pendingPaymentsAmountResult[0]?.total || 0;

  // MTD Ranges & Deltas
  const { currentStart, currentEnd, prevStart, prevEnd } = getMTDRanges();

  // MTD Revenue
  const currentRevenueRes = await Transaction.aggregate([
    { $match: { status: 'paid', createdAt: { $gte: currentStart, $lte: currentEnd } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const currentRevenue = currentRevenueRes[0]?.total || 0;

  const prevRevenueRes = await Transaction.aggregate([
    { $match: { status: 'paid', createdAt: { $gte: prevStart, $lte: prevEnd } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const prevRevenue = prevRevenueRes[0]?.total || 0;
  const revenueDelta = calculateDelta(currentRevenue, prevRevenue);

  // MTD Orders
  const currentOrders = await Order.countDocuments({ createdAt: { $gte: currentStart, $lte: currentEnd } });
  const prevOrders = await Order.countDocuments({ createdAt: { $gte: prevStart, $lte: prevEnd } });
  const ordersDelta = calculateDelta(currentOrders, prevOrders);

  // MTD Users
  const currentUsers = await User.countDocuments({ createdAt: { $gte: currentStart, $lte: currentEnd } });
  const prevUsers = await User.countDocuments({ createdAt: { $gte: prevStart, $lte: prevEnd } });
  const usersDelta = calculateDelta(currentUsers, prevUsers);

  // Order Counts
  const orderCount = await Order.countDocuments();
  const pendingOrders = await Order.countDocuments({ status: 'placed' });
  const completedOrders = await Order.countDocuments({ status: 'completed' });
  const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });

  // Users counts
  const userCount = await User.countDocuments();
  const activeCustomers = await User.countDocuments({ role: 'customer', status: 'active' });
  const activeManagers = await User.countDocuments({ role: 'manager', status: 'active' });
  const activeExecutives = await User.countDocuments({ role: 'executive', status: 'active' });
  
  // Pending approvals
  const pendingExecutives = await User.countDocuments({ role: 'executive', status: 'pending' });
  const pendingOfflinePayments = await Transaction.countDocuments({ status: 'pending' });

  // Monthly sales volumes (for current year)
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const monthlySales = await Transaction.aggregate([
    { $match: { status: 'paid', createdAt: { $gte: startOfYear } } },
    {
      $group: {
        _id: { $month: '$createdAt' },
        totalSales: { $sum: '$amount' }
      }
    },
    { $sort: { '_id': 1 } }
  ]);

  // Construct a standard array for all 12 months
  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    sales: 0
  }));
  monthlySales.forEach(item => {
    monthlyData[item._id - 1].sales = item.totalSales;
  });

  return successResponse(
    res,
    {
      totalRevenue,
      revenueDelta,
      orderCount,
      ordersDelta,
      userCount,
      usersDelta,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      activeCustomers,
      activeManagers,
      activeExecutives,
      pendingExecutives,
      pendingOfflinePayments,
      pendingPaymentsAmount,
      productStock,
      monthlySales: monthlyData,
      monthlySalesDelta: revenueDelta,
    },
    200,
    'Dashboard statistics retrieved successfully.'
  );
});

// 2. Get Sales trends series (Admin only)
export const getSalesSeries = asyncWrapper(async (req, res) => {
  const { interval = 'month' } = req.query;

  let salesGroupField = {};
  let purchaseGroupField = {};
  let arrivalGroupField = {};

  if (interval === 'week') {
    salesGroupField = {
      year: { $year: '$createdAt' },
      week: { $week: '$createdAt' }
    };
    purchaseGroupField = {
      year: { $year: '$purchaseDate' },
      week: { $week: '$purchaseDate' }
    };
    arrivalGroupField = {
      year: { $year: { $ifNull: ['$reviewedAt', '$createdAt'] } },
      week: { $week: { $ifNull: ['$reviewedAt', '$createdAt'] } }
    };
  } else if (interval === 'day') {
    salesGroupField = {
      year: { $year: '$createdAt' },
      month: { $month: '$createdAt' },
      day: { $dayOfMonth: '$createdAt' }
    };
    purchaseGroupField = {
      year: { $year: '$purchaseDate' },
      month: { $month: '$purchaseDate' },
      day: { $dayOfMonth: '$purchaseDate' }
    };
    arrivalGroupField = {
      year: { $year: { $ifNull: ['$reviewedAt', '$createdAt'] } },
      month: { $month: { $ifNull: ['$reviewedAt', '$createdAt'] } },
      day: { $dayOfMonth: { $ifNull: ['$reviewedAt', '$createdAt'] } }
    };
  } else {
    // Default: month
    salesGroupField = {
      year: { $year: '$createdAt' },
      month: { $month: '$createdAt' }
    };
    purchaseGroupField = {
      year: { $year: '$purchaseDate' },
      month: { $month: '$purchaseDate' }
    };
    arrivalGroupField = {
      year: { $year: { $ifNull: ['$reviewedAt', '$createdAt'] } },
      month: { $month: { $ifNull: ['$reviewedAt', '$createdAt'] } }
    };
  }

  // 1. Sales Aggregation
  const sales = await Transaction.aggregate([
    { $match: { status: 'paid' } },
    {
      $group: {
        _id: salesGroupField,
        revenue: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  // 2. Vendor Purchase Aggregation
  const purchases = await VendorPurchase.aggregate([
    { $match: { status: 'received' } },
    {
      $group: {
        _id: purchaseGroupField,
        totalPurchased: { $sum: '$total' }
      }
    }
  ]);

  // 3. Stock Request (Arrivals) Aggregation
  const arrivals = await StockRequest.aggregate([
    { $match: { status: 'approved', type: 'add' } },
    {
      $group: {
        _id: arrivalGroupField,
        totalArrived: { $sum: '$requestedChange' }
      }
    }
  ]);

  const getLabel = (item) => {
    if (interval === 'week') {
      return `${item._id.year}-W${item._id.week}`;
    } else if (interval === 'day') {
      return `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`;
    } else {
      return `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
    }
  };

  const dataMap = {};

  sales.forEach(item => {
    const label = getLabel(item);
    if (!dataMap[label]) {
      dataMap[label] = { label, revenue: 0, count: 0, purchased: 0, onArrival: 0 };
    }
    dataMap[label].revenue = item.revenue;
    dataMap[label].count = item.count;
  });

  purchases.forEach(item => {
    const label = getLabel(item);
    if (!dataMap[label]) {
      dataMap[label] = { label, revenue: 0, count: 0, purchased: 0, onArrival: 0 };
    }
    dataMap[label].purchased = item.totalPurchased;
  });

  arrivals.forEach(item => {
    const label = getLabel(item);
    if (!dataMap[label]) {
      dataMap[label] = { label, revenue: 0, count: 0, purchased: 0, onArrival: 0 };
    }
    dataMap[label].onArrival = item.totalArrived;
  });

  // Sort chronologically by label name
  const formattedSeries = Object.values(dataMap).sort((a, b) => a.label.localeCompare(b.label));

  return successResponse(res, formattedSeries, 200, 'Sales series trends retrieved successfully.');
});

// 3. Get Category Sales ratios (Admin only)
export const getCategorySales = asyncWrapper(async (req, res) => {
  const categorySales = await Order.aggregate([
    { $match: { paymentStatus: 'paid', status: { $ne: 'cancelled' } } },
    { $unwind: '$lines' },
    {
      $lookup: {
        from: 'products',
        localField: 'lines.productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' },
    {
      $lookup: {
        from: 'categories',
        localField: 'product.category',
        foreignField: '_id',
        as: 'categoryInfo'
      }
    },
    { $unwind: '$categoryInfo' },
    {
      $group: {
        _id: '$categoryInfo.name',
        salesAmount: { $sum: '$lines.lineTotal' },
        quantitySold: { $sum: '$lines.quantity' }
      }
    },
    { $sort: { salesAmount: -1 } }
  ]);

  const formattedSales = categorySales.map(item => ({
    category: item._id,
    salesAmount: item.salesAmount,
    quantitySold: item.quantitySold
  }));

  return successResponse(res, formattedSales, 200, 'Category sales distribution retrieved successfully.');
});

// 4. Export CSV reports (Admin only)
export const exportCSV = asyncWrapper(async (req, res, next) => {
  const { type } = req.query;

  if (!type || !['orders', 'products', 'users', 'sales'].includes(type)) {
    return next(new AppError('Invalid export type. Must be orders, products, users, or sales.', 400));
  }

  let headers = [];
  let rows = [];

  if (type === 'orders') {
    headers = ['Order Reference', 'Customer Name', 'Company Name', 'Phone', 'City', 'Subtotal', 'Tax', 'Shipping', 'Total', 'Order Status', 'Payment Status', 'Date'];
    const orders = await Order.find().sort({ createdAt: -1 });
    rows = orders.map(o => [
      o.reference || '',
      o.customerName || '',
      o.companyName || '',
      o.customerPhone || '',
      o.customerCity || '',
      o.subtotal || 0,
      o.tax || 0,
      o.shipping || 0,
      o.total || 0,
      o.status || '',
      o.paymentStatus || '',
      o.createdAt ? o.createdAt.toISOString() : ''
    ]);
  } else if (type === 'products') {
    headers = ['SKU', 'Product Name', 'Category', 'Stock', 'Unit', 'Status', 'Is Archived'];
    const products = await Product.find().populate('category', 'name').sort({ name: 1 });
    rows = products.map(p => [
      p.sku || '',
      p.name || '',
      p.category ? p.category.name : '',
      p.stock || 0,
      p.unit || 'kg',
      p.status || '',
      p.isArchived ? 'Yes' : 'No'
    ]);
  } else if (type === 'users') {
    headers = ['Name', 'Email', 'Mobile', 'Role', 'Status', 'KYC Verified', 'Joined Date'];
    const users = await User.find().sort({ createdAt: -1 });
    rows = users.map(u => [
      u.name || '',
      u.email || '',
      u.mobile || '',
      u.role || '',
      u.status || '',
      u.kycVerified ? 'Yes' : 'No',
      u.createdAt ? u.createdAt.toISOString() : ''
    ]);
  } else if (type === 'sales') {
    headers = ['Name', 'Email', 'Mobile', 'Role', 'Status', 'Region', 'Sales Target', 'Joined Date'];
    const salesUsers = await User.find({ role: { $in: ['manager', 'executive'] } }).sort({ role: 1, createdAt: -1 });
    rows = salesUsers.map(s => [
      s.name || '',
      s.email || '',
      s.mobile || '',
      s.role || '',
      s.status || '',
      s.region || '',
      s.target || 0,
      s.createdAt ? s.createdAt.toISOString() : ''
    ]);
  }

  const csvContent = convertToCSV(headers, rows);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${type}_report_${Date.now()}.csv"`);
  return res.status(200).send(csvContent);
});
