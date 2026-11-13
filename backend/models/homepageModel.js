const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      default: "",
    },
    publicId: {
      type: String,
      default: "",
    },
    name: {
      type: String,
      default: "",
      trim: true,
    },
    alt: {
      type: String,
      default: "",
    },
  },
  { _id: false },
);

const heroSchema = new mongoose.Schema(
  {
    eyebrow: {
      type: String,
      default: "",
    },
    title: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    primaryButtonText: {
      type: String,
      default: "",
    },
    image: {
      type: imageSchema,
      default: () => ({}),
    },
  },
  { _id: false },
);

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "A category name is required."],
    trim: true,
  },
  slug: {
    type: String,
    required: [true, "A category slug is required."],
    lowercase: true,
    trim: true,
  },
  description: {
    type: String,
    default: "",
  },
  image: {
    type: imageSchema,
    default: () => ({}),
  },
  displayOrder: {
    type: Number,
    default: 0,
  },
  isVisible: {
    type: Boolean,
    default: true,
  },
});

const aboutSchema = new mongoose.Schema(
  {
    eyebrow: {
      type: String,
      default: "",
    },
    title: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    gallery: {
      type: [imageSchema],
      default: [],
    },
  },
  { _id: false },
);

const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, "An FAQ question is required."],
    trim: true,
  },
  answer: {
    type: String,
    required: [true, "An FAQ answer is required."],
    trim: true,
  },
  displayOrder: {
    type: Number,
    default: 0,
  },
  isVisible: {
    type: Boolean,
    default: true,
  },
});

const contactSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
    whatsapp: {
      type: String,
      default: "",
    },
    instagram: {
      type: String,
      default: "",
    },
    facebook: {
      type: String,
      default: "",
    },
    x: {
      type: String,
      default: "",
    },
  },
  { _id: false },
);

const statisticSchema = new mongoose.Schema(
  {
    value: {
      type: String,
      default: "",
    },
    label: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    icon: {
      type: String,
      default: "",
    },
  },
  { _id: false },
);

// Flexible homepage section schema.
// Each section can use a different layout and content structure.
const sectionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: [true, "A section type is required."],
    enum: ["image-text", "gallery", "stats", "cta", "custom"],
  },

  eyebrow: {
    type: String,
    default: "",
    trim: true,
  },

  title: {
    type: String,
    default: "",
    trim: true,
  },

  description: {
    type: String,
    default: "",
  },

  // Examples: image-left, image-right, grid, carousel,
  // centered, split, cards, and other future layouts.
  layout: {
    type: String,
    default: "default",
    trim: true,
  },

  // Used by image-text sections.
  image: {
    type: imageSchema,
    default: () => ({}),
  },

  // Used by gallery sections. No arbitrary image-count limit.
  images: {
    type: [imageSchema],
    default: [],
  },

  // Used by statistics and highlights sections.
  stats: {
    type: [statisticSchema],
    default: [],
  },

  // Flexible content for custom sections and future section types.
  items: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },

  content: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  buttonText: {
    type: String,
    default: "",
    trim: true,
  },

  buttonUrl: {
    type: String,
    default: "",
    trim: true,
  },

  displayOrder: {
    type: Number,
    default: 0,
  },

  isVisible: {
    type: Boolean,
    default: true,
  },
});

const homepageSchema = new mongoose.Schema(
  {
    hero: {
      type: heroSchema,
      default: () => ({}),
    },

    categories: {
      type: [categorySchema],
      default: [],
    },

    about: {
      type: aboutSchema,
      default: () => ({}),
    },

    faqs: {
      type: [faqSchema],
      default: [],
    },

    contact: {
      type: contactSchema,
      default: () => ({}),
    },

    // Additional sections created through the Homepage Section Builder.
    sections: {
      type: [sectionSchema],
      default: [],
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const Homepage =
  mongoose.models.Homepage || mongoose.model("Homepage", homepageSchema);

module.exports = Homepage;
