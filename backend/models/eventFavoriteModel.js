const mongoose = require("mongoose");

const eventFavoriteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "An event favorite must belong to a user."],
    },

    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "An event favorite must belong to an event."],
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

// Prevent a user from saving the same event more than once.
eventFavoriteSchema.index({ user: 1, event: 1 }, { unique: true });

// Retrieve a user's saved events efficiently.
eventFavoriteSchema.index({
  user: 1,
  createdAt: -1,
});

// Retrieve users who have saved a particular event.
eventFavoriteSchema.index({
  event: 1,
  createdAt: -1,
});

const EventFavorite = mongoose.model("EventFavorite", eventFavoriteSchema);

module.exports = EventFavorite;
