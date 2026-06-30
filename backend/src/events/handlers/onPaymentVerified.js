import logger from '../../config/logger.js';
import notificationService from '../../modules/notifications/notification.service.js';
import User from '../../modules/users/user.model.js';
import { generateInvoice } from '../../modules/orders/invoice.service.js';
import Order from '../../modules/orders/order.model.js';

export default function registerOnPaymentVerified(eventBus) {
  eventBus.on('payment.verified', async ({ order, transaction }) => {
    logger.info(`[EventHandler] Handling "payment.verified" for Order: ${order.reference}, Transaction: ${transaction._id}`);

    // Generate/ensure invoice PDF exists in permanent storage
    try {
      await generateInvoice(order);
    } catch (err) {
      logger.error(`[EventHandler] Failed to generate invoice for Order ${order.reference} on payment verification:`, err);
    }

    // Retrieve customer email
    let customerEmail = order.customerEmail;
    if (!customerEmail && order.customerId) {
      try {
        const customer = await User.findById(order.customerId);
        customerEmail = customer?.email;
      } catch (err) {
        logger.error('[EventHandler] Error fetching customer details for payment.verified', err);
      }
    }

    // 1. Send Email to Customer
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #0A3324; border-bottom: 2px solid #0A3324; padding-bottom: 10px;">Payment Verified Successfully</h2>
        <p>Dear ${order.customerName || 'Customer'},</p>
        <p>We are pleased to inform you that your payment of <strong>INR ${transaction.amount}</strong> for Order <strong>${order.reference}</strong> has been verified successfully.</p>
        <div style="background: #f4f6f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Order Reference:</strong> ${order.reference}<br/>
          <strong>Transaction ID:</strong> ${transaction._id}<br/>
          <strong>Payment Mode:</strong> ${transaction.mode.toUpperCase()}<br/>
          <strong>Payment Status:</strong> PAID
        </div>
        <p>Your order is currently being processed for delivery. You can download the official invoice from your account dashboard.</p>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">Best regards,<br/>Team Agriport</p>
      </div>
    `;
    if (customerEmail) {
      notificationService.sendEmail(customerEmail, `Agriport Payment Verified: ${order.reference}`, emailHtml);
    }

    // 2. Send WhatsApp to Customer with secure invoice link
    if (order.customerPhone) {
      const latestOrder = await Order.findById(order._id);
      const backendBase = process.env.BASE_URL || 'http://localhost:5000';
      const invoiceUrl = `${backendBase}/api/v1/orders/${order._id}/invoice?shareToken=${latestOrder?.shareToken || ''}`;
      const whatsappMessage = `Dear ${order.customerName}, payment of INR ${transaction.amount} has been verified for order ${order.reference}. Download invoice here:`;
      notificationService.sendWhatsApp(order.customerPhone, whatsappMessage, invoiceUrl);
    }
  });
}
