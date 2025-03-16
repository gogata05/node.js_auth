import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required!'],
      minLength: [2, 'Name must be at least 2 characters!'],
      maxLength: [50, 'Name cannot be more than 50 characters!'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required!'],
      unique: true,
      sparse: true, // This allows multiple null values
      lowercase: true,
      maxLength: [100, 'Email cannot be more than 100 characters!'],
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format!'],
      trim: true,
    },
    imageUrl: {
      type: String,
      default: '',
      maxLength: [1000, 'Image URL cannot be more than 1000 characters!'],
    },
    password: {
      type: String,
      required: [
        function () {
          return !this.googleId;
        },
        'Password is required!',
      ],
      minLength: [6, 'Password must be at least 6 characters!'],
      maxLength: [1024, 'Password cannot be more than 1024 characters!'],
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
      maxLength: [100, 'Google ID cannot be more than 100 characters!'],
    },
    refreshToken: {
      type: String,
      maxLength: [1024, 'Refresh token cannot be more than 1024 characters!'],
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      maxLength: [1024, 'Verification token cannot be more than 1024 characters!'],
    },
    emailVerificationExpires: Date,
    passwordResetToken: {
      type: String,
      maxLength: [1024, 'Password reset token cannot be more than 1024 characters!'],
    },
    passwordResetExpires: Date,
    years: {
      type: String,
      required: false,
      trim: true,
      maxLength: [50, 'Years field cannot be more than 50 characters!'],
    },
    phone: {
      type: String,
      match: [/^[\d\s+()-]{8,20}$/, 'Invalid phone format!'],
      sparse: true,
      maxLength: [20, 'Phone number cannot be more than 20 characters!'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['parent', 'kid'],
      default: 'parent',
      required: [true, 'Role is required!'],
    },
    files: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File',
      },
    ],
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = token;
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = token;
  this.passwordResetExpires = Date.now() + 1 * 60 * 60 * 1000; // 1 hour
  return token;
};

// New method to check if the user is a parent of a given kid
userSchema.methods.isParentOf = function (kidId) {
  return this.kids.includes(kidId);
};

const userModel = mongoose.model('User', userSchema);

export default userModel;
