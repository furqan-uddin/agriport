import logger from '../../config/logger.js';
import notificationService from '../../modules/notifications/notification.service.js';
import User from '../../modules/users/user.model.js';

export default function registerOnPaymentFailed(eventBus) {
  eventBus.on('payment.failed', async ({ order, transaction, reason }) => {
    logger.info(`[EventHandler] Handling "payment.failed" for Order: ${order.reference}`);

    let customerEmail = order.customerEmail;
    if (!customerEmail && order.customerId) {
      try {
        const customer = await User.findById(order.customerId);
        customerEmail = customer?.email;
      } catch (err) {
        logger.error('[EventHandler] Error fetching customer details for payment.failed', err);
      }
    }

    // 1. Send Email to Customer
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #922A20; border-bottom: 2px solid #922A20; padding-bottom: 10px;">Payment Verification Failed</h2>
        <p>Dear ${order.customerName || 'Customer'},</p>
        <p>We were unable to verify your offline payment transaction for Order <strong>${order.reference}</strong>.</p>
        <div style="background: #fdf2f2; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #922A20;">
          <strong>Order Reference:</strong> ${order.reference}<br/>
          <strong>Reason for Failure:</strong> ${reason || 'Transaction reference number could not be validated.'}
        </div>
        <p>Please double-check your payment receipt details or contact support for help.</p>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">Best regards,<br/>Team Agriport</p>
      </div>
    `;
    if (customerEmail) {
      notificationService.sendEmail(customerEmail, `Agriport Payment Verification Failed: ${order.reference}`, emailHtml);
    }

    // 2. Send SMS to Customer
    const smsMessage = `Agriport payment verification failed for order ${order.reference}. Reason: ${reason || 'Verification failed'}. Please contact support.`;
    if (order.customerPhone) {
      notificationService.sendSMS(order.customerPhone, smsMessage);
    }
  });
}
