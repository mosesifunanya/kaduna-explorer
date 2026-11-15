const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide your name"],
      trim: true,
      minlength: [2, "Name must contain at least 2 characters"],
      maxlength: [60, "Name cannot exceed 60 characters"],
    },

    email: {
      type: String,
      required: [true, "Please provide your email address"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
    },

    photo: {
      type: String,
      default: "",
      trim: true,
    },

    photoPublicId: {
      type: String,
      default: "",
      trim: true,
      select: false,
    },

    authProviders: {
      type: [
        {
          type: String,
          enum: ["local", "google"],
        },
      ],
      default: ["local"],
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },

    password: {
      type: String,
      required: [
        function () {
          return this.authProviders.includes("local");
        },
        "Please provide a password",
      ],
      minlength: [8, "Password must contain at least 8 characters"],
      select: false,
    },

    passwordConfirm: {
      type: String,
      required: [
        function () {
          return (
            this.authProviders.includes("local") &&
            (this.isNew || this.isModified("password"))
          );
        },
        "Please confirm your password",
      ],
      validate: {
        validator: function (value) {
          if (!value && !this.isModified("password")) return true;
          return value === this.password;
        },
        message: "Passwords do not match",
      },
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isActive: {
      type: Boolean,
      default: true,
      select: false,
    },

    deactivatedAt: {
      type: Date,
      default: null,
      select: false,
    },

    recoveryExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },

    tokenVersion: {
      type: Number,
      default: 0,
    },

    passwordChangedAt: Date,

    passwordResetToken: {
      type: String,
      select: false,
    },

    passwordResetExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,

    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.passwordConfirm;
        delete ret.googleId;
        delete ret.photoPublicId;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.isActive;
        delete ret.deactivatedAt;
        delete ret.recoveryExpiresAt;
        delete ret.__v;

        return ret;
      },
    },

    toObject: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.passwordConfirm;
        delete ret.googleId;
        delete ret.photoPublicId;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.isActive;
        delete ret.deactivatedAt;
        delete ret.recoveryExpiresAt;
        delete ret.__v;

        return ret;
      },
    },
  },
);

// Hash the password before saving.
userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
});

// Compare a supplied password with the stored hash.
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  if (!userPassword) return false;

  return bcrypt.compare(candidatePassword, userPassword);
};

// Check whether the password changed after JWT issuance.
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (!this.passwordChangedAt || !JWTTimestamp) return false;

  const changedTimestamp = Math.floor(this.passwordChangedAt.getTime() / 1000);

  return JWTTimestamp < changedTimestamp;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
