import logger from '../../config/logger.js';
import notificationService from '../../modules/notifications/notification.service.js';
import User from '../../modules/users/user.model.js';
import { generateInvoice } from '../../modules/orders/invoice.service.js';

export default function registerOnOrderConfirmed(eventBus) {
  eventBus.on('order.confirmed', async (order) => {
    logger.info(`[EventHandler] Handling "order.confirmed" for Order: ${order.reference}`);

    // Generate invoice PDF in permanent storage
    try {
      await generateInvoice(order);
    } catch (err) {
      logger.error(`[EventHandler] Failed to generate invoice for Order ${order.reference} on confirmation:`, err);
    }

    let customerEmail = order.customerEmail;
    if (!customerEmail && order.customerId) {
      try {
        const customer = await User.findById(order.customerId);
        customerEmail = customer?.email;
      } catch (err) {
        logger.error('[EventHandler] Error fetching customer details for order.confirmed', err);
      }
    }

    // 1. Send Email to Customer
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #0A3324; border-bottom: 2px solid #0A3324; padding-bottom: 10px;">Order Confirmed</h2>
        <p>Dear ${order.customerName || 'Customer'},</p>
        <p>Your order <strong>${order.reference}</strong> has been confirmed by our warehouse team.</p>
        <div style="background: #f4f6f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Order Reference:</strong> ${order.reference}<br/>
          <strong>Invoice Number:</strong> ${order.invoiceNo || 'N/A'}<br/>
          <strong>Gate Pass Number:</strong> ${order.gatePassNo || 'N/A'}<br/>
          <strong>Pickup Warehouse Address:</strong> ${order.pickupAddress || 'Agriport Bhiwandi Warehouse'}
        </div>
        <p>Your delivery pass is ready. Please present the Gate Pass number at the warehouse gate during pickup.</p>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">Best regards,<br/>Team Agriport</p>
      </div>
    `;
    if (customerEmail) {
      notificationService.sendEmail(customerEmail, `Agriport Order Confirmed: ${order.reference}`, emailHtml);
    }

    // 2. Send SMS to Customer
    const smsMessage = `Your Agriport order ${order.reference} is confirmed. Gate Pass: ${order.gatePassNo || 'N/A'}. Please pick up from Bhiwandi warehouse.`;
    if (order.customerPhone) {
      notificationService.sendSMS(order.customerPhone, smsMessage);
    }

    // 3. Send WhatsApp to Customer
    if (order.customerPhone) {
      const whatsappMessage = `Dear ${order.customerName}, your order ${order.reference} is confirmed and ready. Gate Pass: ${order.gatePassNo || 'N/A'}. Pickup Address: ${order.pickupAddress || 'Agriport Bhiwandi Warehouse'}.`;
      notificationService.sendWhatsApp(order.customerPhone, whatsappMessage);
    }
  });
}
