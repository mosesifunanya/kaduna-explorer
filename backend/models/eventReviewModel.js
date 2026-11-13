const mongoose = require("mongoose");

const eventReviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, "An event review cannot be empty."],
      trim: true,
      minlength: [3, "An event review must contain at least 3 characters."],
      maxlength: [2000, "An event review cannot exceed 2000 characters."],
    },

    rating: {
      type: Number,
      required: [true, "An event review must have a rating."],
      min: [1, "Rating must be at least 1."],
      max: [5, "Rating cannot exceed 5."],
      validate: {
        validator: Number.isInteger,
        message: "Rating must be a whole number between 1 and 5.",
      },
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "An event review must belong to a user."],
    },

    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "An event review must belong to an event."],
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },

    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    moderatedAt: {
      type: Date,
      default: null,
    },

    moderationNote: {
      type: String,
      trim: true,
      maxlength: [500, "Moderation note cannot exceed 500 characters."],
      default: "",
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

// One review per user for each event.
eventReviewSchema.index({ user: 1, event: 1 }, { unique: true });

// Efficient retrieval of event reviews.
eventReviewSchema.index({
  event: 1,
  status: 1,
  createdAt: -1,
});

// Admin moderation queries.
eventReviewSchema.index({
  status: 1,
  createdAt: -1,
});

// Retrieve a user's event reviews.
eventReviewSchema.index({
  user: 1,
  createdAt: -1,
});

const EventReview = mongoose.model("EventReview", eventReviewSchema);

module.exports = EventReview;
