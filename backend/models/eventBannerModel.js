const mongoose = require("mongoose");

// ============================================
// EVENT BANNER SLIDE SCHEMA
// ============================================

const eventBannerSlideSchema = new mongoose.Schema(
  {
    position: {
      type: Number,
      required: [true, "A banner slide position is required."],
      enum: {
        values: [1, 2, 3],
        message: "Banner slide position must be 1, 2, or 3.",
      },
    },

    url: {
      type: String,
      trim: true,
      default: "",
    },

    publicId: {
      type: String,
      trim: true,
      default: "",
    },

    alt: {
      type: String,
      trim: true,
      maxlength: [
        200,
        "Banner image description cannot exceed 200 characters.",
      ],
      default: "",
    },
  },
  {
    _id: false,
  },
);

// ============================================
// DEFAULT BANNER SLIDES
// ============================================

const createDefaultSlides = () => [
  {
    position: 1,
    url: "",
    publicId: "",
    alt: "",
  },
  {
    position: 2,
    url: "",
    publicId: "",
    alt: "",
  },
  {
    position: 3,
    url: "",
    publicId: "",
    alt: "",
  },
];

// ============================================
// EVENT BANNER CONFIGURATION SCHEMA
// ============================================

const eventBannerSchema = new mongoose.Schema(
  {
    // Keeps one dedicated configuration document
    // for the public Events page.

    key: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      default: "events",
      enum: {
        values: ["events"],
        message: "Invalid event banner configuration key.",
      },
    },

    // Exactly 3 independently managed banner slots.

    slides: {
      type: [eventBannerSlideSchema],
      default: createDefaultSlides,

      validate: {
        validator: function (slides) {
          if (!Array.isArray(slides) || slides.length !== 3) {
            return false;
          }

          return slides.every((slide, index) => slide.position === index + 1);
        },

        message:
          "The Events banner must contain exactly 3 slides in positions 1, 2, and 3.",
      },
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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
// EVENT BANNER MODEL
// ============================================

const EventBanner = mongoose.model("EventBanner", eventBannerSchema);

module.exports = EventBanner;
