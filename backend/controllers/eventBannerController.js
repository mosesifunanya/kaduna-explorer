const EventBanner = require("../models/eventBannerModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const cloudinary = require("../config/cloudinary");

// ============================================
// CONSTANTS
// ============================================

const BANNER_FOLDER = "kaduna-explorer/event-banners";

const SLIDE_POSITIONS = [1, 2, 3];

// ============================================
// CLOUDINARY HELPERS
// ============================================

const uploadToCloudinary = (fileBuffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: BANNER_FOLDER,
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);

        if (!result?.secure_url || !result?.public_id) {
          return reject(
            new Error("Cloudinary returned an incomplete image result."),
          );
        }

        resolve(result);
      },
    );

    stream.end(fileBuffer);
  });

const deleteCloudinaryImages = async (publicIds = []) => {
  const uniquePublicIds = [
    ...new Set(
      publicIds.filter(
        (publicId) =>
          typeof publicId === "string" && publicId.trim().length > 0,
      ),
    ),
  ];

  if (!uniquePublicIds.length) return;

  const results = await Promise.allSettled(
    uniquePublicIds.map((publicId) =>
      cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
      }),
    ),
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(
        `Failed to delete Cloudinary banner image ${uniquePublicIds[index]}:`,
        result.reason,
      );
    }
  });
};

// ============================================
// REQUEST HELPERS
// ============================================

const getSlideFile = (files, position) => {
  const fieldName = `slide${position}`;
  const uploadedFiles = files?.[fieldName];

  if (!uploadedFiles) return null;

  if (!Array.isArray(uploadedFiles) || uploadedFiles.length !== 1) {
    throw new AppError(
      `Only one image can be uploaded for banner slide ${position}.`,
      400,
    );
  }

  const file = uploadedFiles[0];

  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    throw new AppError(
      `The uploaded image for banner slide ${position} is invalid.`,
      400,
    );
  }

  return file;
};

const parseBoolean = (value, fieldName) => {
  if (typeof value === "boolean") return value;

  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;

  throw new AppError(`Invalid ${fieldName} value.`, 400);
};

const getOptionalAltText = (value, position) => {
  if (value === undefined) return undefined;

  if (typeof value !== "string") {
    throw new AppError(
      `Invalid alternative text for banner slide ${position}.`,
      400,
    );
  }

  const alt = value.trim();

  if (alt.length > 200) {
    throw new AppError(
      `Alternative text for banner slide ${position} cannot exceed 200 characters.`,
      400,
    );
  }

  return alt;
};

// ============================================
// BANNER CONFIGURATION HELPERS
// ============================================

const getOrCreateBanner = async () => {
  let banner = await EventBanner.findOne({ key: "events" });

  if (!banner) {
    try {
      banner = await EventBanner.create({
        key: "events",
      });
    } catch (error) {
      // Another request may have created the
      // configuration at the same time.
      if (error.code !== 11000) {
        throw error;
      }

      banner = await EventBanner.findOne({ key: "events" });
    }
  }

  if (!banner) {
    throw new AppError(
      "The Events banner configuration could not be loaded.",
      500,
    );
  }

  return banner;
};

const getPublicSlides = (slides = []) =>
  SLIDE_POSITIONS.map((position) => {
    const slide = slides.find((item) => item.position === position);

    return {
      position,
      url: slide?.url || "",
      alt: slide?.alt || "",
    };
  });

// ============================================
// PUBLIC: GET EVENTS BANNER
// GET /api/v1/event-banners
// ============================================

exports.getEventBanner = catchAsync(async (req, res) => {
  const banner = await getOrCreateBanner();

  return res.status(200).json({
    status: "success",
    data: {
      slides: getPublicSlides(banner.slides),
      updatedAt: banner.updatedAt,
    },
  });
});

// ============================================
// ADMIN: GET EVENTS BANNER
// GET /api/v1/event-banners/admin
// ============================================

exports.getEventBannerAdmin = catchAsync(async (req, res) => {
  const banner = await getOrCreateBanner();

  return res.status(200).json({
    status: "success",
    data: {
      id: banner._id,
      slides: getPublicSlides(banner.slides),
      updatedAt: banner.updatedAt,
    },
  });
});

// ============================================
// ADMIN: UPDATE EVENTS BANNER
// PATCH /api/v1/event-banners/admin
// ============================================

exports.updateEventBanner = catchAsync(async (req, res) => {
  const banner = await getOrCreateBanner();

  const uploadedPublicIds = [];
  const oldPublicIdsToDelete = [];

  try {
    const updatedSlides = banner.slides.map((slide) => ({
      position: slide.position,
      url: slide.url || "",
      publicId: slide.publicId || "",
      alt: slide.alt || "",
    }));

    for (const position of SLIDE_POSITIONS) {
      const slideIndex = updatedSlides.findIndex(
        (slide) => slide.position === position,
      );

      if (slideIndex === -1) {
        throw new AppError(
          `Banner slide ${position} is missing from the configuration.`,
          500,
        );
      }

      const file = getSlideFile(req.files, position);

      const altText = getOptionalAltText(
        req.body?.[`alt${position}`],
        position,
      );

      if (altText !== undefined) {
        updatedSlides[slideIndex].alt = altText;
      }

      const removeValue = req.body?.[`removeSlide${position}`];

      const shouldRemove =
        removeValue === undefined
          ? false
          : parseBoolean(removeValue, `removeSlide${position}`);

      if (file && shouldRemove) {
        throw new AppError(
          `Choose either a replacement image or removal for slide ${position}, not both.`,
          400,
        );
      }

      if (file) {
        const uploadResult = await uploadToCloudinary(file.buffer);

        uploadedPublicIds.push(uploadResult.public_id);

        const oldPublicId = updatedSlides[slideIndex].publicId;

        if (oldPublicId) {
          oldPublicIdsToDelete.push(oldPublicId);
        }

        updatedSlides[slideIndex] = {
          ...updatedSlides[slideIndex],
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
        };
      } else if (shouldRemove) {
        const oldPublicId = updatedSlides[slideIndex].publicId;

        if (oldPublicId) {
          oldPublicIdsToDelete.push(oldPublicId);
        }

        updatedSlides[slideIndex] = {
          ...updatedSlides[slideIndex],
          url: "",
          publicId: "",
          alt: "",
        };
      }
    }

    banner.slides = updatedSlides;

    if (req.user?._id) {
      banner.updatedBy = req.user._id;
    }

    await banner.save();

    // Delete replaced or removed images only after
    // the updated banner has been saved successfully.
    await deleteCloudinaryImages(oldPublicIdsToDelete);

    return res.status(200).json({
      status: "success",
      message: "Events banner updated successfully.",
      data: {
        id: banner._id,
        slides: getPublicSlides(banner.slides),
        updatedAt: banner.updatedAt,
      },
    });
  } catch (error) {
    // Remove newly uploaded images if the database
    // update fails, preventing unused Cloudinary files.
    await deleteCloudinaryImages(uploadedPublicIds);

    throw error;
  }
});
