import mongoose from 'mongoose';

const incentiveRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    role: {
      type: String,
      required: true,
      enum: ['executive', 'manager'],
    },
    month: {
      type: String,
      required: [true, 'Month is required (format: YYYY-MM)'],
      index: true,
    },
    earnedAmount: {
      type: Number,
      default: 0,
    },
    targetAmount: {
      type: Number,
      default: 0,
    },
    commissionRate: {
      type: Number,
      default: 0,
    },
    overrideRate: {
      type: Number,
      default: 0,
    },
    salesVolume: {
      type: Number,
      default: 0,
    },
    teamSalesVolume: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Unique index: a user can have at most one incentive record per month
incentiveRecordSchema.index({ userId: 1, month: 1 }, { unique: true });

const IncentiveRecord = mongoose.model('IncentiveRecord', incentiveRecordSchema);

export default IncentiveRecord;
