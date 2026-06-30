import mongoose from 'mongoose';

const followUpSchema = new mongoose.Schema(
  {
    executiveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Executive ID is required'],
    },
    crmCustomerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CRMCustomer',
      required: [true, 'CRM Customer ID is required'],
      index: true,
    },
    customer: {
      type: String,
      default: '',
    },
    company: {
      type: String,
      default: '',
    },
    dueAt: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    type: {
      type: String,
      required: [true, 'Follow-up type is required'],
      enum: ['call', 'meeting', 'email','whatsapp'],
    },
    note: {
      type: String,
      default: '',
    },
    isDone: {
      type: Boolean,
      required: true,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for executive task list filtered by status and sorted by due date
followUpSchema.index({ executiveId: 1, isDone: 1, dueAt: 1 });

const FollowUp = mongoose.model('FollowUp', followUpSchema);

export default FollowUp;
