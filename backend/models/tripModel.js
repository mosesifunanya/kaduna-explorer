const mongoose = require("mongoose");

const itinerarySchema = new mongoose.Schema(
  {
    destination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Destination",
      required: [true, "An itinerary entry must have a destination"],
    },

    visitDate: {
      type: Date,
    },

    order: {
      type: Number,
      default: 0,
      min: 0,
    },

    visitStatus: {
      type: String,
      enum: ["planned", "visited"],
      default: "planned",
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Destination notes cannot exceed 1000 characters"],
      default: "",
    },
  },
  {
    _id: true,
  },
);

const tripSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A trip must have a name"],
      trim: true,
      minlength: [2, "Trip name must contain at least 2 characters"],
      maxlength: [120, "Trip name cannot exceed 120 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
      default: "",
    },

    startDate: {
      type: Date,
      required: [true, "A trip must have a start date"],
    },

    endDate: {
      type: Date,
      required: [true, "A trip must have an end date"],
      validate: {
        validator: function (value) {
          return !this.startDate || value >= this.startDate;
        },
        message: "End date must be on or after the start date",
      },
    },

    destinations: {
      type: [itinerarySchema],
      default: [],
    },

    status: {
      type: String,
      enum: ["planned", "ongoing", "completed"],
      default: "planned",
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A trip must belong to a user"],
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

tripSchema.index({ user: 1, createdAt: -1 });

tripSchema.index({ user: 1, startDate: 1 });

const Trip = mongoose.model("Trip", tripSchema);

module.exports = Trip;
