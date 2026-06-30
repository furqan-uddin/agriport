import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order ID is required'],
      index: true,
    },
    orderRef: {
      type: String,
      required: [true, 'Order reference is required'],
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer ID is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    mode: {
      type: String,
      required: true,
      enum: ['bank_transfer', 'cash', 'offline'],
      default: 'offline',
    },
    status: {
      type: String,
      required: true,
      enum: ['paid', 'pending', 'failed', 'refunded'],
      default: 'pending',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for covered reporting queries (revenue, dashboard stats)
transactionSchema.index({ status: 1, createdAt: 1, amount: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
