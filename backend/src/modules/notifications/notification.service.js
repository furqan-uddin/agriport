import nodemailer from 'nodemailer';
import env from '../../config/env.js';
import logger from '../../config/logger.js';

// Exponential backoff retry helper
const retry = async (fn, retries = 3, delay = 500) => {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retry(fn, retries - 1, delay * 2);
  }
};

// Transporter cache
let emailTransporter = null;

// Initialize SMTP Transporter if email is enabled and credentials are valid
const getEmailTransporter = () => {
  if (emailTransporter) {
    return emailTransporter;
  }

  const isValidConfig = 
    env.SMTP_HOST && 
    env.SMTP_PORT && 
    env.SMTP_USER && 
    env.SMTP_PASS && 
    !env.SMTP_USER.includes('your_');

  if (env.EMAIL_ENABLED && isValidConfig) {
    emailTransporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
    return emailTransporter;
  }
  return null;
};

/**
 * Sends a transactional email using Nodemailer.
 * Falls back to console logger if email is disabled or config is placeholder.
 * 
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML email body
 * @returns {Promise<boolean>} True if sent/logged successfully
 */
export const sendEmail = async (to, subject, html) => {
  const transporter = getEmailTransporter();

  if (env.EMAIL_ENABLED && transporter) {
    try {
      await retry(() => transporter.sendMail({
        from: env.EMAIL_FROM || 'Agriport <noreply@agriport.in>',
        to,
        subject,
        html,
      }));
      logger.info(`📧 Email sent successfully to ${to}. Subject: "${subject}"`);
      return true;
    } catch (err) {
      logger.error(`❌ Failed to send email to ${to} after retries:`, err);
      // We log but do not block the thread (resilience)
      return false;
    }
  } else {
    logger.info(`[EMAIL MOCK]
    To: ${to}
    Subject: "${subject}"
    Body: ${html.replace(/<[^>]*>/g, '').trim()} // Strip HTML tags for console log
    `);
    return true;
  }
};

/**
 * Sends SMS via Twilio REST API.
 * Falls back to console logger if SMS is disabled or config is placeholder.
 * 
 * @param {string} toMobile - Recipient mobile number (e.g. +91XXXXXXXXXX)
 * @param {string} message - Message body
 * @returns {Promise<boolean>} True if sent/logged successfully
 */
export const sendSMS = async (toMobile, message) => {
  const isValidConfig = 
    env.TWILIO_ACCOUNT_SID && 
    env.TWILIO_AUTH_TOKEN && 
    env.TWILIO_PHONE_NUMBER && 
    !env.TWILIO_ACCOUNT_SID.includes('ACXXXX');

  // Format recipient mobile (ensure country code, prefixing +91 if missing and 10 digits)
  let formattedTo = toMobile.trim();
  if (formattedTo.length === 10 && !formattedTo.startsWith('+')) {
    formattedTo = `+91${formattedTo}`;
  }

  if (env.SMS_ENABLED && isValidConfig) {
    try {
      const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');
      const data = await retry(async () => {
        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: env.TWILIO_PHONE_NUMBER,
              To: formattedTo,
              Body: message,
            }),
          }
        );

        const resData = await response.json();
        if (!response.ok) {
          throw new Error(resData.message || 'Unknown Twilio error');
        }
        return resData;
      });

      logger.info(`📱 SMS sent successfully to ${formattedTo}. SID: ${data.sid}`);
      return true;
    } catch (err) {
      logger.error(`❌ Failed to send SMS to ${formattedTo} after retries:`, err);
      return false;
    }
  } else {
    logger.info(`[SMS MOCK]
    To: ${formattedTo}
    Body: "${message}"
    `);
    return true;
  }
};

/**
 * Sends WhatsApp message via Twilio REST API.
 * Falls back to console logger if WhatsApp is disabled or config is placeholder.
 * 
 * @param {string} toMobile - Recipient mobile number (e.g. +91XXXXXXXXXX)
 * @param {string} message - Message body
 * @param {string} mediaUrl - Optional S3/Cloudinary PDF invoice URL
 * @returns {Promise<boolean>} True if sent/logged successfully
 */
export const sendWhatsApp = async (toMobile, message, mediaUrl = null) => {
  const isValidConfig = 
    env.TWILIO_ACCOUNT_SID && 
    env.TWILIO_AUTH_TOKEN && 
    env.TWILIO_WHATSAPP_NUMBER && 
    !env.TWILIO_ACCOUNT_SID.includes('ACXXXX');

  // Format recipient mobile for WhatsApp
  let formattedTo = toMobile.trim();
  if (formattedTo.length === 10 && !formattedTo.startsWith('+')) {
    formattedTo = `+91${formattedTo}`;
  }
  const whatsappTo = `whatsapp:${formattedTo}`;

  if (env.WHATSAPP_ENABLED && isValidConfig) {
    try {
      const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');
      const bodyParams = {
        From: env.TWILIO_WHATSAPP_NUMBER,
        To: whatsappTo,
        Body: message,
      };

      if (mediaUrl) {
        bodyParams.MediaUrl = mediaUrl;
      }

      const data = await retry(async () => {
        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(bodyParams),
          }
        );

        const resData = await response.json();
        if (!response.ok) {
          throw new Error(resData.message || 'Unknown Twilio WhatsApp error');
        }
        return resData;
      });

      logger.info(`💬 WhatsApp message sent successfully to ${whatsappTo}. SID: ${data.sid}`);
      return true;
    } catch (err) {
      logger.error(`❌ Failed to send WhatsApp to ${whatsappTo} after retries:`, err);
      return false;
    }
  } else {
    logger.info(`[WHATSAPP MOCK]
    To: ${whatsappTo}
    Body: "${message}"
    ${mediaUrl ? `Attachment URL: ${mediaUrl}` : ''}
    `);
    return true;
  }
};

/**
 * Sends a standard 6-digit OTP code via both SMS and Email (if email is supplied)
 * 
 * @param {Object} params
 * @param {string} params.mobile - Recipient mobile
 * @param {string} [params.email] - Optional recipient email
 * @param {string} params.otpCode - The 6-digit code
 * @param {string} params.purpose - Purpose (signup or login)
 */
export const sendOTP = async ({ mobile, email, otpCode, purpose }) => {
  const message = `Your Agriport OTP code for ${purpose} is ${otpCode}. Valid for 10 minutes. Do not share this code.`;
  
  // Send SMS (async background execution)
  sendSMS(mobile, message);

  // Send Email if email is provided (async background execution)
  if (email) {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Agriport Account Verification</h2>
        <p>Please use the following One-Time Password (OTP) to complete your <strong>${purpose}</strong>:</p>
        <div style="font-size: 24px; font-weight: bold; background: #f4f6f8; padding: 15px; text-align: center; border-radius: 5px; letter-spacing: 5px; margin: 20px 0; color: #0A3324;">
          ${otpCode}
        </div>
        <p>This OTP is valid for <strong>10 minutes</strong>. Do not share this OTP with anyone.</p>
        <br />
        <p>Best regards,<br />Team Agriport</p>
      </div>
    `;
    sendEmail(email, `Agriport OTP: ${otpCode} for ${purpose}`, html);
  }
};

export default {
  sendEmail,
  sendSMS,
  sendWhatsApp,
  sendOTP,
};
