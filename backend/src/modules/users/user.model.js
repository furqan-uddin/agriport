import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid email address'],
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: function() { return this.role !== 'customer'; },
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Don't return password in query responses by default
    },
    role: {
      type: String,
      required: true,
      enum: ['customer', 'executive', 'manager', 'admin'],
      default: 'customer',
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'active', 'suspended', 'blocked'],
      default: function() {
        return ['executive', 'customer'].includes(this.role) ? 'pending' : 'active';
      },
    },
    
    // ── CUSTOMER BUSINESS PROFILE ─────────────────────────────────────────────
    companyName: {
      type: String,
      required: function() { return this.role === 'customer'; },
      trim: true,
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    city: {
      type: String,
      required: function() { return this.role === 'customer'; },
      trim: true,
    },
    businessType: {
      type: String,
      required: function() { return this.role === 'customer'; },
      trim: true,
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    state: {
      type: String,
      trim: true,
      default: '',
    },
    country: {
      type: String,
      trim: true,
      default: '',
    },


    // ── STAFF PROFILE (EXECUTIVE & MANAGER) ───────────────────────────────────
    region: {
      type: String,
      required: function() { return ['executive', 'manager'].includes(this.role); },
      trim: true,
    },
    target: {
      type: Number,
      default: 0,
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    // ── KYC DOCUMENTS (EXECUTIVES ONLY) ───────────────────────────────────────
    aadhaarUrl: {
      type: String,
      required: function() { return this.role === 'executive'; },
    },
    panUrl: {
      type: String,
      required: function() { return this.role === 'executive'; },
    },
    kycVerified: {
      type: Boolean,
      default: false,
    },

    // Password Reset fields
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    timestamps: true,
  }
);

// Compound and sorting indexes for user lists
userSchema.index({ role: 1, status: 1, createdAt: -1 });
userSchema.index({ createdAt: -1 });


// Pre-save middleware to hash password
userSchema.pre('save', async function() {
  // Hash password if modified and present
  if (this.isModified('password') && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

// Compare password helper method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
