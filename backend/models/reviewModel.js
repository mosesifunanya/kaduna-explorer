const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, "A review cannot be empty"],
      trim: true,
      minlength: [3, "A review must contain at least 3 characters"],
      maxlength: [2000, "A review cannot exceed 2000 characters"],
    },

    rating: {
      type: Number,
      required: [true, "A review must have a rating"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
      validate: {
        validator: Number.isInteger,
        message: "Rating must be a whole number between 1 and 5",
      },
    },

    photos: {
      type: [
        {
          url: {
            type: String,
            required: [true, "A review photo must have a URL"],
            trim: true,
          },

          publicId: {
            type: String,
            required: [true, "A review photo must have a Cloudinary ID"],
            trim: true,
          },

          alt: {
            type: String,
            trim: true,
            default: "",
          },
        },
      ],
      default: [],
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A review must belong to a user"],
    },

    destination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Destination",
      required: [true, "A review must belong to a destination"],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// One review per user for each destination.
reviewSchema.index({ user: 1, destination: 1 }, { unique: true });

// Efficient destination review retrieval.
reviewSchema.index({ destination: 1, createdAt: -1 });

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
