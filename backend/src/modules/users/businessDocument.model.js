import mongoose from 'mongoose';

const businessDocumentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    type: {
      type: String,
      required: [true, 'Document type is required'],
      enum: ['gst_certificate', 'business_license', 'id_proof', 'address_proof', 'aadhaar', 'pan'],
    },
    name: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileName: String,
    status: {
      type: String,
      required: true,
      enum: ['verified', 'pending', 'missing', 'rejected'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: Date,
  },
  {
    timestamps: true,
  }
);

// A customer can have at most one document of each type
businessDocumentSchema.index({ userId: 1, type: 1 }, { unique: true });

const BusinessDocument = mongoose.model('BusinessDocument', businessDocumentSchema);

export default BusinessDocument;
