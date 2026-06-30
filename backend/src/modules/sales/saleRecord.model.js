import mongoose from 'mongoose';

const saleRecordSchema = new mongoose.Schema(
  {
    ref: {
      type: String,
      unique: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order ID is required'],
      index: true,
    },
    executiveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Executive ID is required'],
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer ID is required'],
      index: true,
    },
    customer: {
      type: String,
      default: '',
    },
    product: {
      type: String,
      default: '',
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ['paid', 'pending', 'failed', 'refunded'],
      default: 'pending',
    },
    commissionAmount: {
      type: Number,
      default: 0,
    },
    overrideAmount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to generate sequential sale reference numbers (e.g., SL-2606-0001)
saleRecordSchema.pre('save', async function() {
  if (this.isNew && !this.ref) {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `SL-${yy}${mm}-`;

    const SaleRecord = mongoose.models.SaleRecord || mongoose.model('SaleRecord', saleRecordSchema);
    const lastRecord = await SaleRecord.findOne(
      { ref: new RegExp('^' + prefix) },
      { ref: 1 }
    ).sort({ ref: -1 });

    let nextNum = 1;
    if (lastRecord) {
      const parts = lastRecord.ref.split('-');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1;
      }
    }

    this.ref = `${prefix}${String(nextNum).padStart(4, '0')}`;
  }
});

// Compound indexes for monthly incentive calculation aggregations
saleRecordSchema.index({ executiveId: 1, paymentStatus: 1, date: 1 });
saleRecordSchema.index({ managerId: 1, paymentStatus: 1, date: 1 });

const SaleRecord = mongoose.model('SaleRecord', saleRecordSchema);

export default SaleRecord;
