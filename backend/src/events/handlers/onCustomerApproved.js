import logger from '../../config/logger.js';
import notificationService from '../../modules/notifications/notification.service.js';

export default function registerOnCustomerApproved(eventBus) {
  eventBus.on('customer.approved', async (customer) => {
    logger.info(`[EventHandler] Handling "customer.approved" for Customer: ${customer.name}`);

    // 1. Send Email to Customer
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #0A3324; border-bottom: 2px solid #0A3324; padding-bottom: 10px;">Customer Account Approved</h2>
        <p>Dear ${customer.name},</p>
        <p>Congratulations! Your Agriport business buyer account and KYC verification have been reviewed and approved by the administrator.</p>
        <p>Your account is now fully active. You can log in to the Agriport storefront using your registered email and password to start browsing products and placing enquiries.</p>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">Best regards,<br/>Team Agriport</p>
      </div>
    `;
    if (customer.email) {
      notificationService.sendEmail(customer.email, 'Agriport Customer Account Approved!', emailHtml);
    }

    // 2. Send SMS to Customer
    const smsMessage = `Hello ${customer.name}, your Agriport customer account is approved. You can now log in and place B2B inquiries.`;
    if (customer.mobile) {
      notificationService.sendSMS(customer.mobile, smsMessage);
    }
  });
}
