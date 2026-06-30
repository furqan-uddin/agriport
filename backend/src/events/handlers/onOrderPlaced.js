import logger from '../../config/logger.js';
import notificationService from '../../modules/notifications/notification.service.js';
import User from '../../modules/users/user.model.js';

export default function registerOnOrderPlaced(eventBus) {
  eventBus.on('order.placed', async (order) => {
    logger.info(`[EventHandler] Handling "order.placed" for Order ID: ${order._id}, Ref: ${order.reference}`);

    // Retrieve customer email if not present in order
    let customerEmail = order.customerEmail;
    if (!customerEmail && order.customerId) {
      try {
        const customer = await User.findById(order.customerId);
        customerEmail = customer?.email;
      } catch (err) {
        logger.error('[EventHandler] Error fetching customer details for order.placed', err);
      }
    }

    // 1. Send Email to Customer
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #0A3324; border-bottom: 2px solid #0A3324; padding-bottom: 10px;">Order Placed Successfully</h2>
        <p>Dear ${order.customerName || 'Customer'},</p>
        <p>Thank you for shopping with Agriport! Your order has been placed successfully and is now awaiting verification.</p>
        <div style="background: #f4f6f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Order Reference:</strong> ${order.reference}<br/>
          <strong>Total Amount:</strong> INR ${order.total}<br/>
          <strong>Payment Mode:</strong> ${order.paymentMode.toUpperCase()}<br/>
          <strong>Delivery Address:</strong> ${order.deliveryAddress || 'N/A'}
        </div>
        <p>We will notify you once your order is confirmed and invoice is generated.</p>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">Best regards,<br/>Team Agriport</p>
      </div>
    `;
    if (customerEmail) {
      notificationService.sendEmail(customerEmail, `Agriport Order Placed: ${order.reference}`, emailHtml);
    }

    // 2. Send SMS to Customer
    const smsMessage = `Your Agriport order ${order.reference} has been placed successfully. Total: INR ${order.total}. Thank you!`;
    if (order.customerPhone) {
      notificationService.sendSMS(order.customerPhone, smsMessage);
    }

    // 3. Send WhatsApp to Executive if assigned
    if (order.executiveId) {
      try {
        const executive = await User.findById(order.executiveId);
        if (executive && executive.mobile) {
          const execMessage = `Hello ${executive.name}, a new order (${order.reference}) has been placed by customer "${order.customerName}". Please review and confirm it in the Admin Panel.`;
          notificationService.sendWhatsApp(executive.mobile, execMessage);
        }
      } catch (err) {
        logger.error('[EventHandler] Error fetching executive details for WhatsApp notification', err);
      }
    }
  });
}
