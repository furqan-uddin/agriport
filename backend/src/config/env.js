import dotenv from 'dotenv';
import { z } from 'zod';

// Load env variables
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  MONGO_URI: z.string({
    required_error: 'MONGO_URI is required',
  }).min(1),
  JWT_SECRET: z.string({
    required_error: 'JWT_SECRET is required',
  }).min(10, 'JWT_SECRET must be at least 10 characters long'),
  JWT_REFRESH_SECRET: z.string({
    required_error: 'JWT_REFRESH_SECRET is required',
  }).min(10, 'JWT_REFRESH_SECRET must be at least 10 characters long'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Email Configuration (Optional unless EMAIL_ENABLED=true)
  EMAIL_ENABLED: z.preprocess((val) => val === 'true', z.boolean().default(false)),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),

  // WhatsApp Configuration (Optional unless WHATSAPP_ENABLED=true)
  WHATSAPP_ENABLED: z.preprocess((val) => val === 'true', z.boolean().default(false)),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().optional(),

  // SMS Configuration (Optional unless SMS_ENABLED=true)
  SMS_ENABLED: z.preprocess((val) => val === 'true', z.boolean().default(false)),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // Cloudinary Configuration
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // OTP Configuration
  USE_MOCK_OTP: z.preprocess((val) => val === 'true', z.boolean().default(false)),
});

// Perform validation
let env;
try {
  env = envSchema.parse(process.env);
  
  // Conditional checks: if a service is enabled, validate its specific keys
  if (env.EMAIL_ENABLED) {
    if (!env.SMTP_HOST || !env.SMTP_PORT || !env.EMAIL_FROM) {
      throw new Error('SMTP_HOST, SMTP_PORT, and EMAIL_FROM are required when EMAIL_ENABLED is true.');
    }
  }
  
  if (env.WHATSAPP_ENABLED) {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_WHATSAPP_NUMBER) {
      throw new Error('TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER are required when WHATSAPP_ENABLED is true.');
    }
  }

  if (env.SMS_ENABLED) {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_PHONE_NUMBER) {
      throw new Error('TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are required when SMS_ENABLED is true.');
    }
  }
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables configuration:');
    error.errors.forEach((err) => {
      console.error(`   - ${err.path.join('.')}: ${err.message}`);
    });
  } else {
    console.error(`❌ Environment validation error: ${error.message}`);
  }
  process.exit(1);
}

export default env;
