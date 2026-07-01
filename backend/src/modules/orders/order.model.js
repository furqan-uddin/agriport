import mongoose from 'mongoose';
import crypto from 'crypto';

const orderLineSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    name: {
      type: String,
      required: [true, 'Product name snapshot is required'],
    },
    image: {
      type: String,
      default: '',
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    unit: {
      type: String,
      required: true,
      default: 'pcs',
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative'],
    },
    lineTotal: {
      type: Number,
      required: true,
    },
    specifications: {
      type: Map,
      of: String,
      default: {},
    },
    variantSize: {
      type: String,
      default: '',
    },
    variantPackingType: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      unique: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer ID is required'],
    },
    executiveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      required: true,
      enum: ['placed', 'confirmed', 'completed', 'cancelled'],
      default: 'placed',
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ['paid', 'pending', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentMode: {
      type: String,
      required: true,
      enum: ['bank_transfer', 'cash', 'offline'],
      default: 'offline',
    },
    lines: {
      type: [orderLineSchema],
      validate: [
        {
          validator: function(val) {
            return val && val.length > 0;
          },
          message: 'Order must contain at least one line item.',
        },
      ],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    tax: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    shipping: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryAddress: {
      type: String,
      required: [true, 'Delivery address is required'],
    },
    pickupAddress: {
      type: String,
      default: '',
    },
    invoiceNo: {
      type: String,
      sparse: true,
      unique: true,
    },
    invoiceUrl: {
      type: String,
    },
    shareToken: {
      type: String,
      unique: true,
      sparse: true,
    },
    gatePassNo: {
      type: String,
      sparse: true,
      unique: true,
    },
    trackingTimeline: {
      type: [
        {
          label: { type: String, required: true },
          at: { type: Date, default: null },
          done: { type: Boolean, default: false },
        },
      ],
      default: function() {
        return [
          { label: 'Placed', at: new Date(), done: true },
          { label: 'Confirmed', at: null, done: false },
          { label: 'Dispatched', at: null, done: false },
          { label: 'Delivered', at: null, done: false },
        ];
      },
    },
    cancellationReason: {
      type: String,
    },
    // Snapshots for quick CRM/admin queries without population
    customerName: String,
    companyName: String,
    customerPhone: String,
    customerCity: String,

    // Executive quote overrides
    quotedPrices: {
      type: Map,
      of: Number,
      default: {},
    },
    quotedShipping: {
      type: Number,
      min: [0, 'Quoted shipping price cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to generate sequential reference numbers and shareToken
orderSchema.pre('save', async function() {
  if (!this.shareToken) {
    this.shareToken = crypto.randomBytes(16).toString('hex');
  }

  if (this.isNew && !this.reference) {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `AGP-${yy}${mm}-`;

    // Find the highest sequence number for this prefix
    const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
    const lastOrder = await Order.findOne(
      { reference: new RegExp('^' + prefix) },
      { reference: 1 }
    ).sort({ reference: -1 });

    let nextNum = 1;
    if (lastOrder) {
      const parts = lastOrder.reference.split('-');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1;
      }
    }

    this.reference = `${prefix}${String(nextNum).padStart(4, '0')}`;
  }
});

// Compound and sorting indexes for orders
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ executiveId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, status: 1 });
orderSchema.index({ createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;
