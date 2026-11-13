const mongoose = require("mongoose");
const Homepage = require("../models/homepageModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const cloudinary = require("../config/cloudinary");

// ============================================
// CONSTANTS
// ============================================

const EMPTY_IMAGE = {
  url: "",
  publicId: "",
  name: "",
  alt: "",
};

const ALLOWED_SECTIONS = ["hero", "categories", "about", "faqs", "contact"];

const ALLOWED_CUSTOM_SECTION_TYPES = [
  "image-text",
  "gallery",
  "stats",
  "cta",
  "custom",
];

// ============================================
// CONTENT HELPERS
// ============================================

const parseContent = (value) => {
  if (!value) {
    throw new AppError("Homepage content is required.", 400);
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    throw new AppError("Invalid homepage content format.", 400);
  }
};

const normalizeImage = (image) => ({
  ...EMPTY_IMAGE,
  ...(image || {}),
});

const normalizeSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const normalizeSectionId = (id) => {
  if (!id) {
    return new mongoose.Types.ObjectId().toString();
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("A homepage section has an invalid ID.", 400);
  }

  return String(id);
};

// ============================================
// HOMEPAGE VALIDATION
// ============================================

const validateHomepageContent = (content) => {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    throw new AppError("Homepage content must be a valid object.", 400);
  }

  for (const section of ALLOWED_SECTIONS) {
    if (content[section] === undefined || content[section] === null) {
      throw new AppError(
        `The ${section} section is missing from the request.`,
        400,
      );
    }
  }

  if (
    typeof content.hero !== "object" ||
    Array.isArray(content.hero) ||
    !Array.isArray(content.categories) ||
    typeof content.about !== "object" ||
    Array.isArray(content.about) ||
    !Array.isArray(content.about.gallery) ||
    !Array.isArray(content.faqs) ||
    typeof content.contact !== "object" ||
    Array.isArray(content.contact)
  ) {
    throw new AppError(
      "One or more homepage sections have an invalid format.",
      400,
    );
  }

  // ------------------------------------------
  // HERO
  // ------------------------------------------

  content.hero.image = normalizeImage(content.hero.image);

  // ------------------------------------------
  // CATEGORIES
  // ------------------------------------------

  const categorySlugs = new Set();

  content.categories = content.categories.map((category) => {
    if (!category || typeof category !== "object" || Array.isArray(category)) {
      throw new AppError("One or more homepage categories are invalid.", 400);
    }

    const slug = normalizeSlug(category.slug || category.name);

    if (!slug) {
      throw new AppError(
        "Every homepage category must have a valid name or slug.",
        400,
      );
    }

    if (categorySlugs.has(slug)) {
      throw new AppError(`Duplicate homepage category slug: ${slug}.`, 400);
    }

    categorySlugs.add(slug);

    return {
      ...category,
      slug,
      image: normalizeImage(category.image),
    };
  });

  // ------------------------------------------
  // ABOUT GALLERY
  // ------------------------------------------

  content.about.gallery = content.about.gallery.map((image) =>
    normalizeImage(image),
  );

  // ------------------------------------------
  // CUSTOM HOMEPAGE SECTIONS
  // ------------------------------------------

  if (content.sections === undefined || content.sections === null) {
    content.sections = [];
  }

  if (!Array.isArray(content.sections)) {
    throw new AppError(
      "Homepage custom sections must be provided as an array.",
      400,
    );
  }

  const sectionIds = new Set();

  content.sections = content.sections.map((section) => {
    if (!section || typeof section !== "object" || Array.isArray(section)) {
      throw new AppError(
        "One or more custom homepage sections are invalid.",
        400,
      );
    }

    if (!ALLOWED_CUSTOM_SECTION_TYPES.includes(section.type)) {
      throw new AppError(
        `Unsupported homepage section type: ${section.type || "unknown"}.`,
        400,
      );
    }

    const sectionId = normalizeSectionId(section._id);

    if (sectionIds.has(sectionId)) {
      throw new AppError(
        "Duplicate homepage section IDs are not allowed.",
        400,
      );
    }

    sectionIds.add(sectionId);

    if (section.images !== undefined && !Array.isArray(section.images)) {
      throw new AppError(
        "Section gallery images must be provided as an array.",
        400,
      );
    }

    if (section.stats !== undefined && !Array.isArray(section.stats)) {
      throw new AppError(
        "Section statistics must be provided as an array.",
        400,
      );
    }

    if (section.items !== undefined && !Array.isArray(section.items)) {
      throw new AppError("Section items must be provided as an array.", 400);
    }

    return {
      ...section,
      _id: sectionId,
      image: normalizeImage(section.image),
      images: (section.images || []).map((image) => normalizeImage(image)),
      stats: section.stats || [],
      items: section.items || [],
      content: section.content || {},
    };
  });

  return content;
};

// ============================================
// CLOUDINARY HELPERS
// ============================================

const uploadToCloudinary = (file, folder) =>
  new Promise((resolve, reject) => {
    if (!file?.buffer) {
      return reject(new AppError("An uploaded image is invalid.", 400));
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `kaduna-explorer/homepage/${folder}`,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        if (!result?.secure_url || !result?.public_id) {
          return reject(
            new Error("Cloudinary returned an invalid image response."),
          );
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          alt: file.originalname || "",
        });
      },
    );

    stream.end(file.buffer);
  });

const deleteCloudinaryImages = async (images = []) => {
  const publicIds = [
    ...new Set(
      images
        .map((image) => (typeof image === "string" ? image : image?.publicId))
        .filter(Boolean),
    ),
  ];

  if (!publicIds.length) return;

  const results = await Promise.allSettled(
    publicIds.map((publicId) =>
      cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
      }),
    ),
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(
        `Failed to delete Cloudinary image ${publicIds[index]}:`,
        result.reason,
      );
    } else if (result.value?.result === "not found") {
      console.warn(`Cloudinary image was not found: ${publicIds[index]}`);
    }
  });
};

// ============================================
// HOMEPAGE IMAGE COLLECTION
// ============================================

const getImagesFromHomepage = (homepage) => {
  if (!homepage) return [];

  const images = [];

  // Hero image
  if (homepage.hero?.image?.publicId) {
    images.push(homepage.hero.image);
  }

  // Category images
  for (const category of homepage.categories || []) {
    if (category.image?.publicId) {
      images.push(category.image);
    }
  }

  // About gallery images
  for (const image of homepage.about?.gallery || []) {
    if (image?.publicId) {
      images.push(image);
    }
  }

  // Custom section images
  for (const section of homepage.sections || []) {
    if (section.image?.publicId) {
      images.push(section.image);
    }

    for (const image of section.images || []) {
      if (image?.publicId) {
        images.push(image);
      }
    }
  }

  return images;
};

const getPublicImageIds = (images = []) =>
  new Set(images.map((image) => image?.publicId).filter(Boolean));

// ============================================
// UPLOAD FIELD VALIDATION
// ============================================

const validateUploadFields = (files, content) => {
  const allowedFields = new Set([
    "heroImage",
    ...content.categories.map((category) => `categoryImage_${category.slug}`),
    ...content.about.gallery.map((_, index) => `aboutImage_${index}`),
    ...content.sections.flatMap((section) => [
      `sectionImage_${section._id}`,
      ...section.images.map(
        (_, index) => `sectionGallery_${section._id}_${index}`,
      ),
    ]),
  ]);

  const receivedFields = new Set();

  for (const file of files) {
    if (!allowedFields.has(file.fieldname)) {
      throw new AppError(
        `Unexpected homepage image field: ${file.fieldname}.`,
        400,
      );
    }

    if (receivedFields.has(file.fieldname)) {
      throw new AppError(
        `Multiple files were provided for ${file.fieldname}.`,
        400,
      );
    }

    receivedFields.add(file.fieldname);
  }
};

// ============================================
// PUBLIC HOMEPAGE
// GET /api/v1/homepage
// ============================================

exports.getPublicHomepage = catchAsync(async (req, res) => {
  const homepage = await Homepage.findOne().lean();

  if (!homepage) {
    throw new AppError("Homepage content has not been configured.", 404);
  }

  const publicHomepage = {
    ...homepage,
    categories: (homepage.categories || []).filter(
      (category) => category.isVisible !== false,
    ),
    faqs: (homepage.faqs || []).filter((faq) => faq.isVisible !== false),
    sections: (homepage.sections || [])
      .filter((section) => section.isVisible !== false)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
  };

  res.status(200).json({
    status: "success",
    data: {
      homepage: publicHomepage,
    },
  });
});

// ============================================
// ADMIN HOMEPAGE
// GET /api/v1/homepage/admin
// ============================================

exports.getAdminHomepage = catchAsync(async (req, res) => {
  const homepage = await Homepage.findOne();

  if (!homepage) {
    throw new AppError("Homepage configuration was not found.", 404);
  }

  res.status(200).json({
    status: "success",
    data: {
      homepage,
    },
  });
});

// ============================================
// UPDATE HOMEPAGE
// PATCH /api/v1/homepage/admin
// ============================================

exports.updateHomepage = catchAsync(async (req, res) => {
  const content = validateHomepageContent(parseContent(req.body.content));
  const files = req.files || [];

  validateUploadFields(files, content);

  let homepage = await Homepage.findOne();

  if (!homepage) {
    homepage = new Homepage();
  }

  const oldImages = getImagesFromHomepage(homepage);
  const uploadedImages = [];

  try {
    // ------------------------------------------
    // HERO IMAGE
    // ------------------------------------------

    const heroFile = files.find((file) => file.fieldname === "heroImage");

    let heroImage = normalizeImage(content.hero.image);

    if (heroFile) {
      const uploaded = await uploadToCloudinary(heroFile, "hero");

      uploadedImages.push(uploaded);
      heroImage = uploaded;
    }

    if (req.body.removeHeroImage === "true") {
      heroImage = { ...EMPTY_IMAGE };
    }

    content.hero.image = heroImage;

    // ------------------------------------------
    // CATEGORY IMAGES
    // ------------------------------------------

    const categories = [];

    for (const category of content.categories) {
      let image = normalizeImage(category.image);

      const categoryFile = files.find(
        (file) => file.fieldname === `categoryImage_${category.slug}`,
      );

      if (categoryFile) {
        const uploaded = await uploadToCloudinary(categoryFile, "categories");

        uploadedImages.push(uploaded);
        image = uploaded;
      }

      categories.push({
        ...category,
        image,
      });
    }

    content.categories = categories;

    // ------------------------------------------
    // ABOUT GALLERY IMAGES
    // ------------------------------------------

    const gallery = [];

    for (let index = 0; index < content.about.gallery.length; index++) {
      const galleryItem = content.about.gallery[index];

      let image = normalizeImage(galleryItem);

      const galleryFile = files.find(
        (file) => file.fieldname === `aboutImage_${index}`,
      );

      if (galleryFile) {
        const uploaded = await uploadToCloudinary(galleryFile, "about");

        uploadedImages.push(uploaded);

        image = {
          ...uploaded,
          name: galleryItem.name || "",
          alt: galleryItem.alt || uploaded.alt,
        };
      }

      gallery.push(image);
    }

    content.about.gallery = gallery;

    // ------------------------------------------
    // CUSTOM SECTION IMAGES
    // ------------------------------------------

    const sections = [];

    for (const section of content.sections) {
      let sectionImage = normalizeImage(section.image);

      // Single image used by image-text sections.
      const sectionImageFile = files.find(
        (file) => file.fieldname === `sectionImage_${section._id}`,
      );

      if (sectionImageFile) {
        const uploaded = await uploadToCloudinary(sectionImageFile, "sections");

        uploadedImages.push(uploaded);
        sectionImage = uploaded;
      }

      // Gallery images used by gallery sections.
      const sectionGallery = [];

      for (let index = 0; index < section.images.length; index++) {
        let image = normalizeImage(section.images[index]);

        const galleryFile = files.find(
          (file) => file.fieldname === `sectionGallery_${section._id}_${index}`,
        );

        if (galleryFile) {
          const uploaded = await uploadToCloudinary(galleryFile, "sections");

          uploadedImages.push(uploaded);
          image = uploaded;
        }

        sectionGallery.push(image);
      }

      sections.push({
        ...section,
        image: sectionImage,
        images: sectionGallery,
      });
    }

    content.sections = sections;

    // ------------------------------------------
    // SAVE HOMEPAGE
    // ------------------------------------------

    homepage.hero = content.hero;
    homepage.categories = content.categories;
    homepage.about = content.about;
    homepage.faqs = content.faqs;
    homepage.contact = content.contact;
    homepage.sections = content.sections;

    if (req.user) {
      homepage.updatedBy = req.user.id || req.user._id;
    }

    await homepage.save();
  } catch (error) {
    // Remove newly uploaded images if the database
    // update fails. Existing images remain untouched.
    await deleteCloudinaryImages(uploadedImages);

    throw error;
  }

  // ------------------------------------------
  // DELETE REPLACED OR REMOVED IMAGES
  // ------------------------------------------

  const newImages = getImagesFromHomepage(homepage);
  const newImageIds = getPublicImageIds(newImages);

  const removedImages = oldImages.filter(
    (image) => !newImageIds.has(image.publicId),
  );

  await deleteCloudinaryImages(removedImages);

  // ------------------------------------------
  // RESPONSE
  // ------------------------------------------

  res.status(200).json({
    status: "success",
    message: "Homepage updated successfully.",
    data: {
      homepage,
    },
  });
});
