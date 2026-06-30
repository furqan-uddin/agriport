import mongoose from 'mongoose';

const crmCustomerSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    company: {
      type: String,
      default: '',
      trim: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    city: {
      type: String,
      default: '',
      trim: true,
    },
    gst: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
    },
    stage: {
      type: String,
      required: true,
      enum: ['lead', 'prospect', 'active', 'dormant'],
      default: 'lead',
    },
    totalValue: {
      type: Number,
      default: 0,
    },
    lastContactAt: {
      type: Date,
      default: null,
    },
    platformUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for executive customer lists filtered by stage and sorted by creation date
crmCustomerSchema.index({ ownerId: 1, stage: 1, createdAt: -1 });

const CRMCustomer = mongoose.model('CRMCustomer', crmCustomerSchema);

export default CRMCustomer;
