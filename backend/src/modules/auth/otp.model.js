import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      index: true,
    },
    otpCode: {
      type: String,
      required: [true, 'OTP code is required'],
    },
    purpose: {
      type: String,
      required: true,
      enum: ['signup', 'login'],
    },
    verified: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600, // Document expires and is auto-deleted after 10 minutes (600 seconds)
    },
  }
);

const OTP = mongoose.model('OTP', otpSchema);

export default OTP;
