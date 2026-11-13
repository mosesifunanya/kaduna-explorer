const mongoose = require("mongoose");

// ============================================
// EVENT IMAGE SCHEMA
// ============================================

const eventImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, "An image URL is required."],
      trim: true,
    },

    publicId: {
      type: String,
      trim: true,
      default: "",
    },

    alt: {
      type: String,
      trim: true,
      maxlength: [200, "Image description cannot exceed 200 characters."],
      default: "",
    },
  },
  { _id: false },
);

// ============================================
// EVENT LOCATION SCHEMA
// ============================================

const eventLocationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },

    coordinates: {
      type: [Number],
      validate: {
        validator: function (coordinates) {
          if (!Array.isArray(coordinates) || coordinates.length !== 2) {
            return false;
          }

          const [longitude, latitude] = coordinates;

          return (
            Number.isFinite(longitude) &&
            Number.isFinite(latitude) &&
            longitude >= -180 &&
            longitude <= 180 &&
            latitude >= -90 &&
            latitude <= 90
          );
        },
        message:
          "Location coordinates must contain valid longitude and latitude values.",
      },
    },
  },
  { _id: false },
);

// ============================================
// EVENT SCHEMA
// ============================================

const eventSchema = new mongoose.Schema(
  {
    // BASIC EVENT INFORMATION

    title: {
      type: String,
      required: [true, "An event must have a title."],
      trim: true,
      minlength: [3, "Event title must contain at least 3 characters."],
      maxlength: [160, "Event title cannot exceed 160 characters."],
    },

    slug: {
      type: String,
      required: [true, "An event must have a slug."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Event slug must contain lowercase letters, numbers and single hyphens.",
      ],
    },

    description: {
      type: String,
      required: [true, "An event must have a description."],
      trim: true,
      minlength: [10, "Event description must contain at least 10 characters."],
      maxlength: [10000, "Event description cannot exceed 10000 characters."],
    },

    shortDescription: {
      type: String,
      trim: true,
      maxlength: [300, "Short description cannot exceed 300 characters."],
      default: "",
    },

    highlights: {
      type: [String],
      default: [],
      validate: {
        validator: function (highlights) {
          return highlights.every(
            (highlight) =>
              typeof highlight === "string" &&
              highlight.trim().length > 0 &&
              highlight.length <= 250,
          );
        },
        message: "Each event highlight must be between 1 and 250 characters.",
      },
    },

    // EVENT CATEGORY

    category: {
      type: String,
      required: [true, "An event category is required."],
      trim: true,
      lowercase: true,
      minlength: [2, "Event category must contain at least 2 characters."],
      maxlength: [60, "Event category cannot exceed 60 characters."],
      match: [
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Event category must use lowercase letters and numbers separated by single hyphens.",
      ],
    },

    categoryLabel: {
      type: String,
      trim: true,
      maxlength: [60, "Category label cannot exceed 60 characters."],
      default: "",
    },

    // EVENT VENUE AND LOCATION

    venue: {
      type: String,
      required: [true, "An event venue is required."],
      trim: true,
      maxlength: [200, "Venue name cannot exceed 200 characters."],
    },

    address: {
      type: String,
      required: [true, "An event address is required."],
      trim: true,
      maxlength: [500, "Event address cannot exceed 500 characters."],
    },

    city: {
      type: String,
      trim: true,
      default: "Kaduna",
      maxlength: [100, "City cannot exceed 100 characters."],
    },

    lga: {
      type: String,
      trim: true,
      default: "",
      maxlength: [100, "LGA cannot exceed 100 characters."],
    },

    state: {
      type: String,
      trim: true,
      default: "Kaduna",
      maxlength: [100, "State cannot exceed 100 characters."],
    },

    location: {
      type: eventLocationSchema,
      default: undefined,
    },

    // EVENT SCHEDULE

    startDate: {
      type: Date,
      required: [true, "An event start date is required."],
    },

    endDate: {
      type: Date,
      required: [true, "An event end date is required."],
      validate: {
        validator: function (value) {
          return !this.startDate || value > this.startDate;
        },
        message: "Event end date must be after the start date.",
      },
    },

    timezone: {
      type: String,
      trim: true,
      default: "Africa/Lagos",
    },

    // EVENT PHOTOGRAPHY

    coverImage: {
      type: String,
      trim: true,
      default: "",
    },

    coverImagePublicId: {
      type: String,
      trim: true,
      default: "",
    },

    images: {
      type: [eventImageSchema],
      default: [],
    },

    // ORGANISER INFORMATION

    organiser: {
      type: String,
      trim: true,
      maxlength: [160, "Organiser name cannot exceed 160 characters."],
      default: "",
    },

    organiserDescription: {
      type: String,
      trim: true,
      maxlength: [1000, "Organiser description cannot exceed 1000 characters."],
      default: "",
    },

    organiserWebsite: {
      type: String,
      trim: true,
      default: "",
    },

    organiserEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    organiserPhone: {
      type: String,
      trim: true,
      default: "",
    },

    // TICKETS AND REGISTRATION

    ticketUrl: {
      type: String,
      trim: true,
      default: "",
    },

    registrationUrl: {
      type: String,
      trim: true,
      default: "",
    },

    ticketInformation: {
      type: String,
      trim: true,
      maxlength: [1000, "Ticket information cannot exceed 1000 characters."],
      default: "",
    },

    // EVENT RATINGS

    averageRating: {
      type: Number,
      default: 0,
      min: [0, "Average rating cannot be negative."],
      max: [5, "Average rating cannot exceed 5."],
    },

    ratingsCount: {
      type: Number,
      default: 0,
      min: [0, "Rating count cannot be negative."],
      validate: {
        validator: Number.isInteger,
        message: "Rating count must be a whole number.",
      },
    },

    // PUBLICATION AND ADMINISTRATION

    isPublished: {
      type: Boolean,
      default: false,
    },

    // FEATURED EXPERIENCE DISPLAY
    // Controlled by the administrator.
    // Featured events also remain in the normal event listings.

    isFeatured: {
      type: Boolean,
      default: false,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "An event must have an administrator as its creator."],
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

// ============================================
// DATABASE INDEXES
// ============================================

eventSchema.index({
  isPublished: 1,
  startDate: 1,
  endDate: 1,
});

eventSchema.index({
  isPublished: 1,
  category: 1,
  startDate: 1,
});

eventSchema.index({ location: "2dsphere" });

eventSchema.index({ createdAt: -1 });

// Supports published featured-event queries.
eventSchema.index({ isPublished: 1, isFeatured: 1, startDate: 1 });

// ============================================
// EVENT DATE VALIDATION
// Mongoose 9: use synchronous validation middleware.
// Do not use the removed next() callback pattern.
// ============================================

eventSchema.pre("validate", function () {
  if (
    this.startDate instanceof Date &&
    !Number.isNaN(this.startDate.getTime()) &&
    this.endDate instanceof Date &&
    !Number.isNaN(this.endDate.getTime()) &&
    this.endDate <= this.startDate
  ) {
    this.invalidate("endDate", "Event end date must be after the start date.");
  }
});

// ============================================
// EVENT MODEL
// ============================================

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
