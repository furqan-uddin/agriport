import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true,
    },
    sku: {
      type: String,
      required: [true, 'Product SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    brand: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Product category is required'],
    },
    origin: {
      type: String,
      required: [true, 'Origin is required'],
      default: 'India',
      trim: true,
    },
    grade: {
      type: String,
      required: [true, 'Grade is required'],
      default: 'Standard',
      trim: true,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
    },
    unit: {
      type: String,
      required: true,
      default: 'pcs',
    },
    isExecutiveOnly: {
      type: Boolean,
      required: true,
      default: false,
    },
    images: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      default: '',
    },
    moq: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['in_stock', 'out_of_stock'],
      default: 'in_stock',
    },
    priceSlabs: [
      {
        minQty: { type: Number, required: true },
        unitPrice: { type: Number, required: true },
      },
    ],
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
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to auto-generate SKU if not present
productSchema.pre('validate', function() {
  if (!this.sku) {
    const cleanName = (this.name || 'PROD').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.sku = `SKU-${cleanName.substring(0, 10)}-${rand}`;
  }
});

// Pre-save hook: keep product.stock in sync as sum of all sizeVariant carton counts
productSchema.pre('save', function() {
  if (this.sizeVariants && this.sizeVariants.length > 0) {
    this.stock = this.sizeVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
  }
  // Auto-update status based on stock
  this.status = this.stock > 0 ? 'in_stock' : 'out_of_stock';
});

// Indexes
productSchema.index({ name: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ isExecutiveOnly: 1 });
productSchema.index({ brand: 1 });

const Product = mongoose.model('Product', productSchema);

export default Product;
