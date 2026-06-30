import logger from '../../config/logger.js';
import notificationService from '../../modules/notifications/notification.service.js';

export default function registerOnExecutiveApproved(eventBus) {
  eventBus.on('executive.approved', async (executive) => {
    logger.info(`[EventHandler] Handling "executive.approved" for Executive: ${executive.name}`);

    // 1. Send Email to Executive
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #0A3324; border-bottom: 2px solid #0A3324; padding-bottom: 10px;">Executive Account Approved</h2>
        <p>Dear ${executive.name},</p>
        <p>Congratulations! Your Agriport executive onboarding and KYC verification have been reviewed and approved by the administrator.</p>
        <p>Your account is now fully active. You can log in to the Agriport platform using your registered mobile number and password to start managing leads and orders.</p>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">Best regards,<br/>Team Agriport</p>
      </div>
    `;
    if (executive.email) {
      notificationService.sendEmail(executive.email, 'Agriport Executive Account Approved!', emailHtml);
    }

    // 2. Send SMS to Executive
    const smsMessage = `Hello ${executive.name}, your Agriport executive onboarding is approved. Your account is now active. You can start logging in.`;
    if (executive.mobile) {
      notificationService.sendSMS(executive.mobile, smsMessage);
    }
  });
}
