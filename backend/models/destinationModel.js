const mongoose = require("mongoose");

const BUILT_IN_CATEGORIES = [
  "attraction",
  "restaurant",
  "hotel",
  "cafe",
  "park",
  "nature",
  "culture",
  "historical-site",
  "shopping",
  "entertainment",
  "sports",
  "event",
  "service",
  "hospital",
  "clinic",
  "pharmacy",
  "diagnostic-laboratory",
  "dental-clinic",
  "eye-clinic",
  "wellness",
  "family-activity",
  "recreation",
  "playground",
  "cinema",
  "museum",
  "art-gallery",
  "heritage-site",
  "waterfall",
  "scenic-viewpoint",
  "market",
  "supermarket",
  "bank",
  "atm",
  "fuel-station",
  "car-repair",
  "salon",
  "barbershop",
  "laundry",
  "university",
  "school",
  "library",
  "religious-site",
  "transport",
  "bus-terminal",
  "railway-station",
  "parking",
  "car-rental",
  "tour-operator",
  "resort",
  "guest-house",
  "short-let",
  "event-venue",
  "nightlife",
  "other",
];

const destinationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A destination must have a name"],
      trim: true,
      minlength: [2, "Name must contain at least 2 characters"],
      maxlength: [120, "Name cannot exceed 120 characters"],
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      required: [true, "A destination must have a description"],
      trim: true,
      minlength: [10, "Description must contain at least 10 characters"],
    },

    shortDescription: {
      type: String,
      trim: true,
      maxlength: [240, "Short description cannot exceed 240 characters"],
      default: "",
    },

    category: {
      type: String,
      required: [true, "A destination must have a category"],
      trim: true,
      lowercase: true,
      minlength: [2, "Category must contain at least 2 characters"],
      maxlength: [60, "Category cannot exceed 60 characters"],
      match: [
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Category must use lowercase letters and numbers separated by single hyphens",
      ],
    },

    categoryLabel: {
      type: String,
      trim: true,
      maxlength: [60, "Category label cannot exceed 60 characters"],
      default: "",
    },

    isCustomCategory: {
      type: Boolean,
      default: false,
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    city: {
      type: String,
      default: "Kaduna",
      trim: true,
    },

    lga: {
      type: String,
      trim: true,
      default: "",
    },

    state: {
      type: String,
      default: "Kaduna",
      trim: true,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: undefined,
        validate: {
          validator(coordinates) {
            if (!coordinates || coordinates.length === 0) {
              return true;
            }

            if (coordinates.length !== 2) {
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
            "Coordinates must be [longitude, latitude] with valid geographic ranges",
        },
      },
    },

    images: [
      {
        url: {
          type: String,
          required: true,
          trim: true,
        },
        publicId: {
          type: String,
          default: "",
        },
        alt: {
          type: String,
          default: "",
          trim: true,
        },
      },
    ],

    coverImage: {
      type: String,
      default: "",
      trim: true,
    },

    priceLevel: {
      type: String,
      enum: ["free", "budget", "moderate", "expensive", "unknown"],
      default: "unknown",
    },

    entranceFee: {
      type: String,
      trim: true,
      default: "",
    },

    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    ratingsCount: {
      type: Number,
      min: 0,
      default: 0,
    },

    openingHours: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    contactPhone: {
      type: String,
      trim: true,
      default: "",
    },

    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    website: {
      type: String,
      trim: true,
      default: "",
    },

    reservationUrl: {
      type: String,
      trim: true,
      default: "",
    },

    tags: {
      type: [String],
      default: [],
    },

    amenities: {
      type: [String],
      default: [],
    },

    suitableFor: {
      type: [String],
      default: [],
    },

    isPublished: {
      type: Boolean,
      default: false,
    },

    // Global display position controlled by admin drag-and-drop.
    // Independent of featuredOrder.
    displayOrder: {
      type: Number,
      default: null,
      min: 0,
    },

    // Existing featured destination settings remain independent.
    isFeatured: {
      type: Boolean,
      default: false,
    },

    featuredOrder: {
      type: Number,
      min: 1,
      max: 4,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,

    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },

    toObject: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

destinationSchema.index({ location: "2dsphere" });
destinationSchema.index({ category: 1, isPublished: 1 });
destinationSchema.index({ isPublished: 1, createdAt: -1 });

// Supports global display ordering.
destinationSchema.index({ isPublished: 1, displayOrder: 1 });

// Preserve existing featured destination ordering.
destinationSchema.index({
  isPublished: 1,
  isFeatured: 1,
  featuredOrder: 1,
});

destinationSchema.index({
  name: "text",
  description: "text",
  shortDescription: "text",
  categoryLabel: "text",
  city: "text",
  lga: "text",
  tags: "text",
});

destinationSchema.pre("validate", function () {
  if (this.isModified("name") && this.name) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  if (this.category) {
    this.category = this.category
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "-");

    this.isCustomCategory = !BUILT_IN_CATEGORIES.includes(this.category);
  }

  if (!this.categoryLabel && this.category) {
    this.categoryLabel = this.category
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  if (!this.isFeatured) {
    this.featuredOrder = null;
  }
});

const Destination = mongoose.model("Destination", destinationSchema);

module.exports = Destination;
