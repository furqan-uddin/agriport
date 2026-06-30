import logger from '../../config/logger.js';
import notificationService from '../../modules/notifications/notification.service.js';

export default function registerOnPasswordResetRequested(eventBus) {
  eventBus.on('password.reset_requested', async ({ user, otpCode, resetUrl }) => {
    logger.info(`[EventHandler] Handling "password.reset_requested" for User: ${user.name}`);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #0A3324; border-bottom: 2px solid #0A3324; padding-bottom: 10px;">Agriport Password Reset Request</h2>
        <p>Hello ${user.name},</p>
        <p>We received a request to reset the password for your Agriport account. Please use the following 6-digit Verification Code (OTP) to reset your password:</p>
        <div style="font-size: 24px; font-weight: bold; background: #f4f6f8; padding: 15px; text-align: center; border-radius: 5px; letter-spacing: 5px; margin: 20px 0; color: #0A3324;">
          ${otpCode}
        </div>
        <p>Alternatively, you can reset your password directly by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #0A3324; color: white; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">Reset Password</a>
        </div>
        <p>Note: This code and link will expire in 10 minutes. If you did not request this, please ignore this email or contact support if you have concerns.</p>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">Best regards,<br />Team Agriport</p>
      </div>
    `;

    if (user.email) {
      notificationService.sendEmail(user.email, 'Agriport Password Reset OTP', emailHtml);
    }
  });
}
