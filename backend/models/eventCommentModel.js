const mongoose = require("mongoose");

const eventCommentSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.ObjectId,
      ref: "Event",
      required: [true, "A comment must belong to an event"],
    },

    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "A comment must belong to a user"],
    },

    comment: {
      type: String,
      required: [true, "Please write a comment"],
      trim: true,
      minlength: [1, "A comment cannot be empty"],
      maxlength: [2000, "A comment cannot exceed 2000 characters"],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
    toObject: {
      virtuals: true,
    },
  },
);

eventCommentSchema.index({ event: 1, createdAt: -1 });
eventCommentSchema.index({ user: 1, createdAt: -1 });

const EventComment = mongoose.model("EventComment", eventCommentSchema);

module.exports = EventComment;
