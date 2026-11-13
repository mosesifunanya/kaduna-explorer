const mongoose = require("mongoose");

const favoriteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A favorite must belong to a user"],
    },

    destination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Destination",
      required: [true, "A favorite must belong to a destination"],
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

// Prevent the same user from saving a destination more than once.
favoriteSchema.index({ user: 1, destination: 1 }, { unique: true });

// Retrieve a user's favorites efficiently.
favoriteSchema.index({ user: 1, createdAt: -1 });

const Favorite = mongoose.model("Favorite", favoriteSchema);

module.exports = Favorite;
