import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    device: {
      ip: {
        type: String,
        default: '',
      },
      userAgent: {
        type: String,
        default: '',
      },
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
    revokedReason: {
      type: String,
      default: '',
    },
    replacedByToken: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// TTL index: Mongoose will tell MongoDB to automatically drop documents
// when the current time is past the expiresAt field.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

export default RefreshToken;
