import mongoose from 'mongoose';
import crypto from 'crypto';

const vendorPurchaseSchema = new mongoose.Schema(
  {
    purchasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Purchaser ID is required'],
      index: true,
    },
    vendorName: {
      type: String,
      required: [true, 'Vendor name is required'],
      trim: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    productName: {
      type: String,
      required: [true, 'Product name snapshot is required'],
    },
    brand: {
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
    buyPrice: {
      type: Number,
      required: [true, 'Buy price is required'],
    },
    total: {
      type: Number,
      required: [true, 'Total amount is required'],
    },
    purchaseDate: {
      type: Date,
      required: [true, 'Purchase date is required'],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['received', 'pending', 'ordered'],
      default: 'pending',
    },
    notes: {
      type: String,
      default: '',
    },
    vendorPhone: {
      type: String,
      default: '',
    },
    shareToken: {
      type: String,
      default: '',
    },
    sizeVariants: [
      {
        size: { type: String, required: true },
        stock: { type: Number, required: true, default: 0 },
        price: { type: Number, required: true, default: 0 },
        packingType: { type: String, default: 'Cartoon' },
        netWeight: { type: Number },
        grossWeight: { type: Number },
      },
    ],
    specifications: {
      type: Map,
      of: String,
      default: {},
    },
    images: {
      type: [String],
      default: [],
    },
    origin: {
      type: String,
      default: '',
    },
    leadTimeDays: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: auto-generate shareToken on first save
vendorPurchaseSchema.pre('save', function (next) {
  if (!this.shareToken) {
    this.shareToken = crypto.randomBytes(16).toString('hex');
  }
  next();
});

const VendorPurchase = mongoose.model('VendorPurchase', vendorPurchaseSchema);

export default VendorPurchase;
