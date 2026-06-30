import User from './user.model.js';
import Order from '../orders/order.model.js';
import SaleRecord from '../sales/saleRecord.model.js';
import SystemSetting from '../sales/systemSetting.model.js';
import { paginate } from '../../utils/paginate.js';
import asyncWrapper from '../../utils/asyncWrapper.js';
import AppError from '../../utils/AppError.js';
import { successResponse } from '../../utils/apiResponse.js';
import eventBus from '../../events/index.js';

// 1. Get all users (Admin only)
export const getAdminUsers = asyncWrapper(async (req, res) => {
  const { status, role, search } = req.query;

  const queryObj = {};

  if (status) queryObj.status = status;
  if (role) queryObj.role = role;

  if (search) {
    queryObj.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { mobile: new RegExp(search, 'i') },
      { companyName: new RegExp(search, 'i') },
    ];
  }

  const result = await paginate(User, queryObj, req.query, {
    sort: { createdAt: -1 }
  });

  const userIds = result.docs.map(u => u._id);
  const orderStats = await Order.aggregate([
    { $match: { customerId: { $in: userIds } } },
    {
      $group: {
        _id: '$customerId',
        ordersCount: { $sum: 1 },
        totalSpend: { $sum: '$total' },
      }
    }
  ]);

  const statsMap = {};
  orderStats.forEach(stat => {
    statsMap[stat._id.toString()] = {
      ordersCount: stat.ordersCount,
      totalSpend: stat.totalSpend,
    };
  });

  const usersWithStats = result.docs.map(user => {
    const userObj = user.toObject ? user.toObject() : { ...user };
    const stats = statsMap[user._id.toString()] || { ordersCount: 0, totalSpend: 0 };
    userObj.ordersCount = stats.ordersCount;
    userObj.totalSpend = stats.totalSpend;
    return userObj;
  });

  return successResponse(
    res,
    {
      users: usersWithStats,
      pagination: result.pagination,
    },
    200,
    'Users retrieved successfully.'
  );
});

// 2. Update user status (Admin only)
export const updateUserStatus = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['active', 'suspended', 'blocked', 'pending'].includes(status)) {
    return next(new AppError('Invalid status value.', 400));
  }

  const user = await User.findById(id);
  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  const wasActive = user.status === 'active';
  user.status = status;
  await user.save();

  if (!wasActive && user.status === 'active') {
    if (user.role === 'executive') {
      eventBus.emit('executive.approved', user);
    } else if (user.role === 'customer') {
      eventBus.emit('customer.approved', user);
    }
  }

  return successResponse(res, user, 200, `User status updated to "${status}" successfully.`);
});

// 3. Verify customer/executive KYC (Admin only)
export const verifyUserKyc = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { kycVerified } = req.body;

  const user = await User.findById(id);
  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  const wasActive = user.status === 'active';
  user.kycVerified = kycVerified === true || kycVerified === 'true';
  
  // Auto-activate customer/executive account once KYC document is verified
  if (user.kycVerified && user.status === 'pending') {
    if (user.role === 'executive' || user.role === 'customer') {
      user.status = 'active';
    }
  }

  await user.save();

  if (!wasActive && user.status === 'active') {
    if (user.role === 'executive') {
      eventBus.emit('executive.approved', user);
    } else if (user.role === 'customer') {
      eventBus.emit('customer.approved', user);
    }
  }

  return successResponse(res, user, 200, 'User KYC verification status updated successfully.');
});

// 4. Get all sales managers (Admin only)
export const getManagers = asyncWrapper(async (req, res) => {
  const managers = await User.find({ role: 'manager' }).sort({ createdAt: -1 });

  const managersWithStats = await Promise.all(
    managers.map(async (manager) => {
      const managerObj = manager.toObject ? manager.toObject() : { ...manager };
      
      // Count active executives in manager's team
      const teamSize = await User.countDocuments({
        managerId: manager._id,
        role: 'executive',
        status: 'active',
      });

      // Sum revenue from paid sale records for this manager
      const salesVolumeResult = await SaleRecord.aggregate([
        {
          $match: {
            managerId: manager._id,
            paymentStatus: 'paid',
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
          },
        },
      ]);
      
      const revenue = salesVolumeResult[0]?.totalRevenue || 0;

      managerObj.teamSize = teamSize;
      managerObj.revenue = revenue;
      return managerObj;
    })
  );

  return successResponse(res, managersWithStats, 200, 'Managers retrieved successfully.');
});

// 5. Create a new manager (Admin only)
export const createManager = asyncWrapper(async (req, res, next) => {
  const { name, email, mobile, password, region, target } = req.body;

  const exists = await User.findOne({ $or: [{ email }, { mobile }] });
  if (exists) {
    return next(new AppError('Manager with this email or mobile number already exists.', 409));
  }

  const manager = await User.create({
    name,
    email,
    mobile,
    password,
    role: 'manager',
    status: 'active',
    region,
    target: Number(target) || 0,
  });

  return successResponse(res, manager, 201, 'Sales Manager created successfully.');
});

// 6. Get pending executive approvals (Admin only)
export const getExecutiveApprovals = asyncWrapper(async (req, res) => {
  const pendingExecutives = await User.find({
    role: 'executive',
    status: 'pending',
  }).sort({ createdAt: -1 });

  return successResponse(res, pendingExecutives, 200, 'Pending executives retrieved successfully.');
});

// 7. Approve or reject executive onboarding (Admin only)
export const approveExecutive = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'blocked'].includes(status)) {
    return next(new AppError('Approval status must be either "active" or "blocked".', 400));
  }

  const executive = await User.findOne({ _id: id, role: 'executive' });
  if (!executive) {
    return next(new AppError('Executive not found.', 404));
  }

  executive.status = status;
  if (status === 'active') {
    executive.kycVerified = true;
  }
  
  await executive.save();

  if (status === 'active') {
    eventBus.emit('executive.approved', executive);
  }

  return successResponse(res, executive, 200, `Executive account ${status === 'active' ? 'approved' : 'rejected'} successfully.`);
});

// Helper to serialize user matching frontend User interface
import BusinessDocument from './businessDocument.model.js';

export const serializeUser = (user) => {
  if (!user) return null;
  const userObj = user.toObject ? user.toObject() : { ...user };
  userObj.fullName = userObj.name || '';
  userObj.id = userObj._id ? userObj._id.toString() : '';
  return userObj;
};

// 8. Get current authenticated user profile (Customer/Staff)
export const getProfile = asyncWrapper(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return next(new AppError('User profile not found.', 404));
  }
  return successResponse(res, serializeUser(user), 200, 'Profile retrieved successfully.');
});

// 9. Update current authenticated user profile
export const updateProfile = asyncWrapper(async (req, res, next) => {
  const { fullName, name, companyName, businessType, address, city, state, country, gstNumber } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  const newName = fullName || name;
  if (newName) user.name = newName;
  if (companyName) user.companyName = companyName;
  if (businessType) user.businessType = businessType;
  if (address) user.address = address;
  if (city) user.city = city;
  if (state) user.state = state;
  if (country) user.country = country;
  if (gstNumber) user.gstNumber = gstNumber;

  await user.save();

  return successResponse(res, serializeUser(user), 200, 'Profile updated successfully.');
});

// 10. Get customer business documents
export const getDocuments = asyncWrapper(async (req, res) => {
  const documents = await BusinessDocument.find({ userId: req.user._id });
  
  // Format for frontend
  const formattedDocs = documents.map(d => ({
    id: d._id.toString(),
    type: d.type,
    name: d.name,
    fileName: d.fileName || '',
    fileUrl: d.fileUrl,
    status: d.status,
    uploadedOn: d.createdAt,
  }));

  // Ensure default list is returned with placeholders if documents are missing
  const defaultTypes = [
    { type: 'gst_certificate', name: 'GST Certificate' },
    { type: 'business_license', name: 'Business License' },
    { type: 'id_proof', name: 'ID Proof (PAN/Aadhaar)' },
    { type: 'address_proof', name: 'Address Proof' },
  ];

  const finalDocs = defaultTypes.map(def => {
    const existing = formattedDocs.find(fd => fd.type === def.type);
    if (existing) return existing;
    return {
      id: `missing-${def.type}`,
      type: def.type,
      name: def.name,
      fileName: '',
      fileUrl: '',
      status: 'missing',
      uploadedOn: null,
    };
  });

  return successResponse(res, finalDocs, 200, 'Documents retrieved successfully.');
});

// 11. Upload customer business document
export const uploadDocument = asyncWrapper(async (req, res, next) => {
  const { type } = req.body;
  if (!type) {
    return next(new AppError('Document type is required.', 400));
  }

  // Retrieve uploaded file details from multer upload middleware
  const fileKey = Object.keys(req.uploadedFiles || {})[0];
  const filesList = req.uploadedFiles?.[fileKey];
  const file = filesList && filesList.length > 0 ? filesList[0] : null;

  if (!file) {
    return next(new AppError('No document file was uploaded.', 400));
  }

  const docNames = {
    gst_certificate: 'GST Certificate',
    business_license: 'Business License',
    id_proof: 'ID Proof (PAN/Aadhaar)',
    address_proof: 'Address Proof',
  };

  const documentName = docNames[type] || 'Business Document';

  // Upsert the document
  const document = await BusinessDocument.findOneAndUpdate(
    { userId: req.user._id, type },
    {
      name: documentName,
      fileUrl: file, // URL or filename from handleUploads middleware
      fileName: file.split('/').pop() || 'document.pdf',
      status: 'pending',
      rejectionReason: '',
      verifiedBy: null,
      verifiedAt: null,
    },
    { upsert: true, new: true, runValidators: true }
  );

  const responseDoc = {
    id: document._id.toString(),
    type: document.type,
    name: document.name,
    fileName: document.fileName,
    fileUrl: document.fileUrl,
    status: document.status,
    uploadedOn: document.createdAt,
  };

  // Emit kyc.uploaded event
  eventBus.emit('kyc.uploaded', { user: req.user, document });

  return successResponse(res, responseDoc, 201, 'Document uploaded successfully.');
});

// 12. Get documents for a specific user (Admin only)
export const getAdminUserDocuments = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  // If the user is an executive, return their KYC documents stored directly on their profile
  if (user.role === 'executive') {
    const executiveDocs = [];
    if (user.aadhaarUrl) {
      executiveDocs.push({
        id: 'executive-aadhaar',
        type: 'aadhaar_card',
        name: 'Aadhaar Card ID Proof',
        fileName: 'aadhaar.pdf',
        fileUrl: user.aadhaarUrl,
        status: user.kycVerified ? 'verified' : 'pending',
        uploadedOn: user.createdAt,
      });
    }
    if (user.panUrl) {
      executiveDocs.push({
        id: 'executive-pan',
        type: 'pan_card',
        name: 'PAN Card ID Proof',
        fileName: 'pan.pdf',
        fileUrl: user.panUrl,
        status: user.kycVerified ? 'verified' : 'pending',
        uploadedOn: user.createdAt,
      });
    }
    return successResponse(res, executiveDocs, 200, 'Executive documents retrieved successfully.');
  }

  const documents = await BusinessDocument.find({ userId: id });
  
  // Format for frontend
  const formattedDocs = documents.map(d => ({
    id: d._id.toString(),
    type: d.type,
    name: d.name,
    fileName: d.fileName || '',
    fileUrl: d.fileUrl,
    status: d.status,
    uploadedOn: d.createdAt,
  }));

  // Ensure default list is returned with placeholders if documents are missing
  const defaultTypes = [
    { type: 'gst_certificate', name: 'GST Certificate' },
    { type: 'business_license', name: 'Business License' },
    { type: 'id_proof', name: 'ID Proof (PAN/Aadhaar)' },
    { type: 'address_proof', name: 'Address Proof' },
  ];

  const finalDocs = defaultTypes.map(def => {
    const existing = formattedDocs.find(fd => fd.type === def.type);
    if (existing) return existing;
    return {
      id: `missing-${def.type}`,
      type: def.type,
      name: def.name,
      fileName: '',
      fileUrl: '',
      status: 'missing',
      uploadedOn: null,
    };
  });

  return successResponse(res, finalDocs, 200, 'Customer documents retrieved successfully.');
});

// 13. Get Sales Settings (commission, override, gst, and shipping) (Admin only)
export const getSalesSettings = asyncWrapper(async (req, res) => {
  let commissionSetting = await SystemSetting.findOne({ key: 'sales_commission' });
  let overrideSetting = await SystemSetting.findOne({ key: 'manager_override' });
  let gstRateSetting = await SystemSetting.findOne({ key: 'gst_rate' });
  let shippingThresholdSetting = await SystemSetting.findOne({ key: 'shipping_threshold' });
  let baseShippingSetting = await SystemSetting.findOne({ key: 'base_shipping_charge' });

  if (!commissionSetting) {
    commissionSetting = await SystemSetting.create({ key: 'sales_commission', value: 5 });
  }
  if (!overrideSetting) {
    overrideSetting = await SystemSetting.create({ key: 'manager_override', value: 2 });
  }
  if (!gstRateSetting) {
    gstRateSetting = await SystemSetting.create({ key: 'gst_rate', value: 5 });
  }
  if (!shippingThresholdSetting) {
    shippingThresholdSetting = await SystemSetting.create({ key: 'shipping_threshold', value: 50000 });
  }
  if (!baseShippingSetting) {
    baseShippingSetting = await SystemSetting.create({ key: 'base_shipping_charge', value: 1500 });
  }

  return successResponse(res, {
    commission: commissionSetting.value,
    override: overrideSetting.value,
    gstRate: gstRateSetting.value,
    shippingThreshold: shippingThresholdSetting.value,
    baseShipping: baseShippingSetting.value,
  }, 200, 'Sales settings retrieved successfully.');
});

// 14. Update Sales Settings (Admin only)
export const updateSalesSettings = asyncWrapper(async (req, res, next) => {
  const { commission, override, gstRate, shippingThreshold, baseShipping } = req.body;

  if (commission !== undefined) {
    if (typeof commission !== 'number' || commission < 0 || commission > 100) {
      return next(new AppError('Commission rate must be a number between 0 and 100.', 400));
    }
    await SystemSetting.findOneAndUpdate(
      { key: 'sales_commission' },
      { value: commission },
      { upsert: true, new: true }
    );
  }

  if (override !== undefined) {
    if (typeof override !== 'number' || override < 0 || override > 100) {
      return next(new AppError('Override rate must be a number between 0 and 100.', 400));
    }
    await SystemSetting.findOneAndUpdate(
      { key: 'manager_override' },
      { value: override },
      { upsert: true, new: true }
    );
  }

  if (gstRate !== undefined) {
    if (typeof gstRate !== 'number' || gstRate < 0 || gstRate > 100) {
      return next(new AppError('GST rate must be a number between 0 and 100.', 400));
    }
    await SystemSetting.findOneAndUpdate(
      { key: 'gst_rate' },
      { value: gstRate },
      { upsert: true, new: true }
    );
  }

  if (shippingThreshold !== undefined) {
    if (typeof shippingThreshold !== 'number' || shippingThreshold < 0) {
      return next(new AppError('Shipping threshold must be a non-negative number.', 400));
    }
    await SystemSetting.findOneAndUpdate(
      { key: 'shipping_threshold' },
      { value: shippingThreshold },
      { upsert: true, new: true }
    );
  }

  if (baseShipping !== undefined) {
    if (typeof baseShipping !== 'number' || baseShipping < 0) {
      return next(new AppError('Base shipping charge must be a non-negative number.', 400));
    }
    await SystemSetting.findOneAndUpdate(
      { key: 'base_shipping_charge' },
      { value: baseShipping },
      { upsert: true, new: true }
    );
  }

  return successResponse(res, {
    commission,
    override,
    gstRate,
    shippingThreshold,
    baseShipping,
  }, 200, 'Sales settings updated successfully.');
});

// 15. Get all executives with sales performance (Admin only)
export const getAdminExecutives = asyncWrapper(async (req, res) => {
  const executives = await User.find({ role: 'executive', status: 'active' }).sort({ createdAt: -1 });

  const execsWithStats = await Promise.all(
    executives.map(async (exec) => {
      // Sum revenue from paid sale records for this executive
      const salesVolumeResult = await SaleRecord.aggregate([
        {
          $match: {
            executiveId: exec._id,
            paymentStatus: 'paid',
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
          },
        },
      ]);

      const revenue = salesVolumeResult[0]?.totalRevenue || 0;

      // Get manager's name
      let managerName = 'None';
      if (exec.managerId) {
        const manager = await User.findById(exec.managerId);
        if (manager) {
          managerName = manager.name;
        }
      }

      const execObj = serializeUser(exec);
      execObj.revenue = revenue;
      execObj.managerName = managerName;

      return execObj;
    })
  );

  return successResponse(res, execsWithStats, 200, 'Executives retrieved successfully.');
});

// 16. Update user (manager or executive) sales target (Admin only)
export const updateUserTarget = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { target } = req.body;

  if (target === undefined || isNaN(Number(target)) || Number(target) < 0) {
    return next(new AppError('Invalid target value. Must be a non-negative number.', 400));
  }

  const user = await User.findById(id);
  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  if (user.role !== 'executive' && user.role !== 'manager') {
    return next(new AppError('Targets can only be set for sales team members (executives or managers).', 400));
  }

  user.target = Number(target);
  await user.save();

  // Emit target assigned event
  eventBus.emit('user.target_assigned', { user, target: user.target });

  return successResponse(res, serializeUser(user), 200, 'Sales target updated successfully.');
});

// 17. Assign a manager to an executive (Admin only)
export const assignManager = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { managerId } = req.body;

  const executive = await User.findOne({ _id: id, role: 'executive' });
  if (!executive) {
    return next(new AppError('Executive not found.', 404));
  }

  if (managerId) {
    const manager = await User.findOne({ _id: managerId, role: 'manager' });
    if (!manager) {
      return next(new AppError('Target Manager not found or invalid role.', 404));
    }
    executive.managerId = manager._id;
  } else {
    executive.managerId = undefined; // Unassign manager
  }

  await executive.save();

  // Emit manager assigned event
  eventBus.emit('user.manager_assigned', { executive, managerId });

  return successResponse(res, serializeUser(executive), 200, 'Sales Executive assigned to Manager successfully.');
});


