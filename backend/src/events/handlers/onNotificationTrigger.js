import logger from '../../config/logger.js';
import Notification from '../../modules/notifications/notification.model.js';
import User from '../../modules/users/user.model.js';
import { sendSSEMessage } from '../../modules/notifications/sseManager.js';

// Helper to create notifications in bulk or singly and push them via SSE
const createNotification = async ({ recipientIds, senderId, title, message, type, entityId }) => {
  try {
    const ids = Array.isArray(recipientIds) ? recipientIds : [recipientIds];
    const docs = ids.filter(Boolean).map(recipientId => ({
      recipientId,
      senderId,
      title,
      message,
      type,
      entityId,
    }));
    if (docs.length > 0) {
      const createdDocs = await Notification.insertMany(docs);
      logger.info(`[Notifications] Created ${createdDocs.length} notifications of type "${type}".`);
      
      // Push live notification and invalidate cache
      for (const doc of createdDocs) {
        sendSSEMessage(doc.recipientId, 'notification_created', doc);
        sendSSEMessage(doc.recipientId, 'invalidate', ['Notification']);
      }
    }
  } catch (err) {
    logger.error(`[Notifications] Error creating in-app notification for type "${type}":`, err);
  }
};

// Helper to get all Admin IDs
const getAdminIds = async () => {
  try {
    const admins = await User.find({ role: 'admin' }, '_id');
    return admins.map(a => a._id);
  } catch (err) {
    logger.error('[Notifications] Error fetching admin IDs:', err);
    return [];
  }
};

export default function registerOnNotificationTrigger(eventBus) {
  // 1. Customer Registered
  eventBus.on('customer.registered', async (customer) => {
    const admins = await getAdminIds();
    await createNotification({
      recipientIds: admins,
      senderId: customer._id,
      title: 'New Customer Signup',
      message: `New customer "${customer.name}" has registered and is pending approval.`,
      type: 'auth',
      entityId: customer._id,
    });
    
    // Invalidate AdminUser lists for admins
    for (const id of admins) {
      sendSSEMessage(id, 'invalidate', ['AdminUser']);
    }
  });

  // 2. Executive Registered
  eventBus.on('executive.registered', async (executive) => {
    const admins = await getAdminIds();
    await createNotification({
      recipientIds: admins,
      senderId: executive._id,
      title: 'New Executive Registration',
      message: `New sales executive "${executive.name}" has registered and is pending approval.`,
      type: 'auth',
      entityId: executive._id,
    });

    // Invalidate AdminUser and Executive lists for admins
    for (const id of admins) {
      sendSSEMessage(id, 'invalidate', ['AdminUser', 'Executive']);
    }
  });

  // 3. Customer Approved
  eventBus.on('customer.approved', async (customer) => {
    await createNotification({
      recipientIds: customer._id,
      title: 'Account Approved',
      message: 'Your customer account has been fully verified and activated. Welcome to Agriport!',
      type: 'auth',
      entityId: customer._id,
    });

    sendSSEMessage(customer._id, 'invalidate', ['AdminUser']);
    const admins = await getAdminIds();
    for (const id of admins) {
      sendSSEMessage(id, 'invalidate', ['AdminUser']);
    }
  });

  // 4. Executive Approved
  eventBus.on('executive.approved', async (executive) => {
    await createNotification({
      recipientIds: executive._id,
      title: 'Account Approved',
      message: 'Your executive account has been fully verified and activated. Welcome to Agriport!',
      type: 'auth',
      entityId: executive._id,
    });

    sendSSEMessage(executive._id, 'invalidate', ['AdminUser', 'Executive']);
    const admins = await getAdminIds();
    for (const id of admins) {
      sendSSEMessage(id, 'invalidate', ['AdminUser', 'Executive']);
    }
  });

  // 5. KYC Uploaded
  eventBus.on('kyc.uploaded', async ({ user, document }) => {
    const admins = await getAdminIds();
    await createNotification({
      recipientIds: admins,
      senderId: user._id,
      title: 'KYC Document Uploaded',
      message: `User "${user.name}" (${user.role}) uploaded a document for KYC verification.`,
      type: 'kyc',
      entityId: user._id,
    });

    for (const id of admins) {
      sendSSEMessage(id, 'invalidate', ['Document', 'AdminUser']);
    }
    sendSSEMessage(user._id, 'invalidate', ['Document']);
  });

  // 6. Order Placed
  eventBus.on('order.placed', async (order) => {
    const admins = await getAdminIds();
    const recipients = [...admins];
    if (order.executiveId) {
      recipients.push(order.executiveId);
    }
    await createNotification({
      recipientIds: recipients,
      senderId: order.customerId,
      title: 'New Enquiry Placed',
      message: `New enquiry ${order.reference} placed by customer "${order.customerName}" (Total: INR ${order.total}).`,
      type: 'order',
      entityId: order._id,
    });

    // Invalidate Order and Product cache tags for everyone involved
    const notifyUsers = [order.customerId, order.executiveId, ...admins].filter(Boolean);
    for (const id of notifyUsers) {
      sendSSEMessage(id, 'invalidate', ['Order', 'Product']);
    }
  });

  // 7. Order Quoted
  eventBus.on('order.quoted', async (order) => {
    await createNotification({
      recipientIds: order.customerId,
      senderId: order.executiveId,
      title: 'Enquiry Price Quoted',
      message: `Your enquiry ${order.reference} has been quoted at INR ${order.total}. Review details to pay.`,
      type: 'order',
      entityId: order._id,
    });

    const admins = await getAdminIds();
    const notifyUsers = [order.customerId, order.executiveId, ...admins].filter(Boolean);
    for (const id of notifyUsers) {
      sendSSEMessage(id, 'invalidate', ['Order']);
    }
  });

  // 8. Order Confirmed
  eventBus.on('order.confirmed', async (order) => {
    await createNotification({
      recipientIds: order.customerId,
      title: 'Order Confirmed',
      message: `Your order ${order.reference} has been confirmed. Stock is reserved.`,
      type: 'order',
      entityId: order._id,
    });

    const admins = await getAdminIds();
    const notifyUsers = [order.customerId, order.executiveId, ...admins].filter(Boolean);
    for (const id of notifyUsers) {
      sendSSEMessage(id, 'invalidate', ['Order', 'Product']);
    }
  });

  // 9. Order Cancelled
  eventBus.on('order.cancelled', async ({ order, cancelledBy, reason }) => {
    const isCustomer = cancelledBy && cancelledBy.role === 'customer';
    let recipients = [];
    if (isCustomer) {
      const admins = await getAdminIds();
      recipients = [...admins];
      if (order.executiveId) recipients.push(order.executiveId);
    } else {
      recipients = [order.customerId];
    }
    await createNotification({
      recipientIds: recipients,
      senderId: cancelledBy?._id,
      title: 'Order Cancelled',
      message: `Order ${order.reference} has been cancelled: "${reason || 'N/A'}".`,
      type: 'order',
      entityId: order._id,
    });

    const admins = await getAdminIds();
    const notifyUsers = [order.customerId, order.executiveId, ...admins].filter(Boolean);
    for (const id of notifyUsers) {
      sendSSEMessage(id, 'invalidate', ['Order', 'Product']);
    }
  });

  // 10. Order Delivered
  eventBus.on('order.delivered', async (order) => {
    await createNotification({
      recipientIds: order.customerId,
      title: 'Order Delivered',
      message: `Your order ${order.reference} has been delivered successfully. Gate pass generated.`,
      type: 'order',
      entityId: order._id,
    });

    const admins = await getAdminIds();
    const notifyUsers = [order.customerId, order.executiveId, ...admins].filter(Boolean);
    for (const id of notifyUsers) {
      sendSSEMessage(id, 'invalidate', ['Order']);
    }
  });

  // 11. Payment Submitted
  eventBus.on('payment.submitted', async ({ order, amount }) => {
    const admins = await getAdminIds();
    const recipients = [...admins];
    if (order.executiveId) recipients.push(order.executiveId);

    await createNotification({
      recipientIds: recipients,
      senderId: order.customerId,
      title: 'Payment Pending Verification',
      message: `Offline payment receipt uploaded for Order ${order.reference} (Amount: INR ${amount}).`,
      type: 'payment',
      entityId: order._id,
    });

    const notifyUsers = [order.customerId, order.executiveId, ...admins].filter(Boolean);
    for (const id of notifyUsers) {
      sendSSEMessage(id, 'invalidate', ['Order']);
    }
  });

  // 12. Payment Verified
  eventBus.on('payment.verified', async ({ order }) => {
    const recipients = [order.customerId];
    if (order.executiveId) recipients.push(order.executiveId);

    await createNotification({
      recipientIds: recipients,
      title: 'Payment Verified',
      message: `Payment verified for Order ${order.reference}. Sale record generated.`,
      type: 'payment',
      entityId: order._id,
    });

    const admins = await getAdminIds();
    const notifyUsers = [order.customerId, order.executiveId, ...admins].filter(Boolean);
    for (const id of notifyUsers) {
      sendSSEMessage(id, 'invalidate', ['Order']);
    }
  });

  // 13. Stock Request Created
  eventBus.on('stockRequest.created', async (stockRequest) => {
    const admins = await getAdminIds();
    let requesterName = 'Executive/Manager';
    try {
      const user = await User.findById(stockRequest.requesterId);
      if (user) requesterName = user.name;
    } catch (err) {
      logger.error(err);
    }
    await createNotification({
      recipientIds: admins,
      senderId: stockRequest.requesterId,
      title: 'Stock Request Raised',
      message: `Stock request raised by "${requesterName}" for "${stockRequest.productName}" (Qty: ${stockRequest.requestedChange}).`,
      type: 'stock',
      entityId: stockRequest._id,
    });

    const notifyUsers = [stockRequest.requesterId, ...admins].filter(Boolean);
    for (const id of notifyUsers) {
      sendSSEMessage(id, 'invalidate', ['StockRequest']);
    }
  });

  // 14. Stock Request Approved
  eventBus.on('stockRequest.approved', async ({ stockRequest, reviewerId }) => {
    await createNotification({
      recipientIds: stockRequest.requesterId,
      senderId: reviewerId,
      title: 'Stock Request Approved',
      message: `Your stock request for "${stockRequest.productName}" (Qty: ${stockRequest.requestedChange}) has been approved.`,
      type: 'stock',
      entityId: stockRequest._id,
    });

    const admins = await getAdminIds();
    const notifyUsers = [stockRequest.requesterId, ...admins].filter(Boolean);
    for (const id of notifyUsers) {
      sendSSEMessage(id, 'invalidate', ['StockRequest', 'Product']);
    }
  });

  // 15. Stock Request Rejected
  eventBus.on('stockRequest.rejected', async ({ stockRequest, reviewerId, reason }) => {
    await createNotification({
      recipientIds: stockRequest.requesterId,
      senderId: reviewerId,
      title: 'Stock Request Rejected',
      message: `Your stock request for "${stockRequest.productName}" was rejected: "${reason || 'No reason provided'}".`,
      type: 'stock',
      entityId: stockRequest._id,
    });

    const admins = await getAdminIds();
    const notifyUsers = [stockRequest.requesterId, ...admins].filter(Boolean);
    for (const id of notifyUsers) {
      sendSSEMessage(id, 'invalidate', ['StockRequest']);
    }
  });

  // 16. Target Assigned
  eventBus.on('user.target_assigned', async ({ user, target }) => {
    const recipients = [user._id];
    if (user.managerId) recipients.push(user.managerId);
    await createNotification({
      recipientIds: recipients,
      title: 'Sales Target Assigned',
      message: `A new sales target of INR ${target} has been assigned to sales team member "${user.name}".`,
      type: 'auth',
      entityId: user._id,
    });

    const admins = await getAdminIds();
    const notifyUsers = [user._id, user.managerId, ...admins].filter(Boolean);
    for (const id of notifyUsers) {
      sendSSEMessage(id, 'invalidate', ['AdminUser', 'Executive', 'Manager', 'SalesSetting']);
    }
  });

  // 17. Manager Assigned
  eventBus.on('user.manager_assigned', async ({ executive, managerId }) => {
    const recipients = [executive._id];
    if (managerId) recipients.push(managerId);
    let managerName = 'Manager';
    try {
      const manager = await User.findById(managerId);
      if (manager) managerName = manager.name;
    } catch (err) {
      logger.error(err);
    }
    await createNotification({
      recipientIds: recipients,
      title: 'Manager Relationship Updated',
      message: `Sales Executive "${executive.name}" assigned to Manager "${managerName}".`,
      type: 'auth',
      entityId: executive._id,
    });

    const admins = await getAdminIds();
    const notifyUsers = [executive._id, managerId, ...admins].filter(Boolean);
    for (const id of notifyUsers) {
      sendSSEMessage(id, 'invalidate', ['AdminUser', 'Executive', 'Manager']);
    }
  });

  // 18. Vendor Purchase Logged
  eventBus.on('vendorPurchase.created', async ({ purchase, purchaser }) => {
    const admins = await getAdminIds();
    const recipients = [...admins];
    if (purchaser.managerId) recipients.push(purchaser.managerId);

    await createNotification({
      recipientIds: recipients,
      senderId: purchaser._id,
      title: 'Vendor Purchase Logged',
      message: `New vendor purchase logged by "${purchaser.name}" for "${purchase.productName}" (Total: INR ${purchase.total}).`,
      type: 'stock',
      entityId: purchase._id,
    });

    const notifyUsers = [purchaser._id, purchaser.managerId, ...admins].filter(Boolean);
    for (const id of notifyUsers) {
      sendSSEMessage(id, 'invalidate', ['Product', 'StockRequest']);
    }
  });
}
