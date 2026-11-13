const Destination = require("../models/destinationModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const cloudinary = require("../config/cloudinary");
const {
  getOrSet,
  invalidateDestinationCache,
} = require("../utils/destinationCache");

const MAX_FEATURED_DESTINATIONS = 4;
const ARRAY_FIELDS = ["tags", "amenities", "suitableFor"];

// ============================================
// CLOUDINARY IMAGE UPLOAD
// ============================================

const uploadToCloudinary = (fileBuffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "kaduna-explorer/destinations",
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);

        if (!result) {
          return reject(new Error("Cloudinary returned no image."));
        }

        resolve(result);
      },
    );

    stream.end(fileBuffer);
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
    }
  });
};

const uploadDestinationImages = async (files = []) => {
  if (!files.length) return [];

  for (const file of files) {
    if (!file?.buffer) {
      throw new AppError("An uploaded image is invalid.", 400);
    }
  }

  const results = await Promise.allSettled(
    files.map(async (file) => {
      const result = await uploadToCloudinary(file.buffer);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        alt: file.originalname || "",
      };
    }),
  );

  const uploadedImages = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  const failedUpload = results.find((result) => result.status === "rejected");

  if (failedUpload) {
    await deleteCloudinaryImages(uploadedImages);

    console.error("Cloudinary image upload failed:", failedUpload.reason);

    throw new AppError(
      "An image could not be uploaded. Check your backend terminal and Cloudinary configuration.",
      502,
    );
  }

  return uploadedImages;
};

// ============================================
// FILE HELPERS
// Supports upload.any() and upload.fields().
// ============================================

const getUploadedFiles = (files, fieldName) => {
  if (!files) return [];

  const aliases =
    fieldName === "coverImage"
      ? ["coverImage", "cover"]
      : ["images", "galleryImages"];

  if (Array.isArray(files)) {
    return files.filter((file) => aliases.includes(file.fieldname));
  }

  for (const alias of aliases) {
    if (Array.isArray(files[alias])) {
      return files[alias];
    }
  }

  return [];
};

// ============================================
// REQUEST DATA PARSERS
// ============================================

const parseBoolean = (value, fieldName) => {
  if (typeof value === "boolean") return value;

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;

  throw new AppError(`Invalid ${fieldName}.`, 400);
};

const parseNumber = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new AppError(`Invalid ${fieldName}.`, 400);
  }

  return parsed;
};

const parseJsonField = (value, fieldName) => {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    throw new AppError(`Invalid ${fieldName} JSON.`, 400);
  }
};

const parseArrayField = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  const parsed = parseJsonField(value, fieldName);

  if (Array.isArray(parsed)) {
    return parsed
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof parsed === "string") {
    return parsed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  throw new AppError(`${fieldName} must be a list.`, 400);
};

// ============================================
// LOCATION AND SLUG HELPERS
// ============================================

const getLocationFromRequest = (body, existingLocation = null) => {
  const hasLatitude = body.latitude !== undefined && body.latitude !== "";

  const hasLongitude = body.longitude !== undefined && body.longitude !== "";

  if (!hasLatitude && !hasLongitude) {
    return existingLocation;
  }

  if (!hasLatitude || !hasLongitude) {
    throw new AppError("Both latitude and longitude are required.", 400);
  }

  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new AppError("Invalid latitude or longitude.", 400);
  }

  return {
    type: "Point",
    coordinates: [longitude, latitude],
  };
};

const createSlug = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// ============================================
// PREPARE DESTINATION DATA
// ============================================

const prepareDestinationData = (body, existingLocation = null) => {
  const data = { ...body };

  // Support forms that submit shortDescription only.
  if (
    (typeof data.description !== "string" || !data.description.trim()) &&
    typeof data.shortDescription === "string"
  ) {
    data.description = data.shortDescription.trim();
  }

  const excludedFields = [
    "latitude",
    "longitude",
    "retainedImagePublicIds",
    "retainedImageUrls",
    "removeImagePublicIds",
    "retainedCoverImage",
    "coverImagePublicId",
    "createdBy",
    "displayOrder",
    "isCustomCategory",
  ];

  excludedFields.forEach((field) => delete data[field]);

  if (body.latitude !== undefined || body.longitude !== undefined) {
    data.location = getLocationFromRequest(body, existingLocation);
  } else if (existingLocation) {
    data.location = existingLocation;
  }

  for (const field of ["isPublished", "isFeatured"]) {
    const parsed = parseBoolean(data[field], field);

    if (parsed !== undefined) {
      data[field] = parsed;
    } else {
      delete data[field];
    }
  }

  if (data.featuredOrder !== undefined) {
    data.featuredOrder = parseNumber(data.featuredOrder, "featured order");
  }

  if (data.openingHours !== undefined) {
    data.openingHours = parseJsonField(data.openingHours, "opening hours");
  }

  if (data.location !== undefined && typeof data.location === "string") {
    data.location = parseJsonField(data.location, "location");
  }

  for (const field of ARRAY_FIELDS) {
    if (data[field] !== undefined) {
      data[field] = parseArrayField(data[field], field);
    }
  }

  for (const field of [
    "name",
    "description",
    "shortDescription",
    "address",
    "city",
    "lga",
    "state",
    "website",
    "contactPhone",
    "contactEmail",
    "reservationUrl",
    "categoryLabel",
    "entranceFee",
  ]) {
    if (data[field] !== undefined && typeof data[field] === "string") {
      data[field] = data[field].trim();
    }
  }

  if (data.category !== undefined) {
    data.category = String(data.category)
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "-");

    if (!data.category) {
      throw new AppError("A destination category is required.", 400);
    }
  }

  if (data.categoryLabel !== undefined) {
    data.categoryLabel = String(data.categoryLabel).trim();
  }

  if (data.category === "other" && !data.categoryLabel) {
    throw new AppError("Please provide a heading for the Other category.", 400);
  }

  return data;
};

// ============================================
// GALLERY RETENTION AND REMOVAL HELPERS
// ============================================

const getRetainedImageLists = (body) => {
  let publicIds = [];
  let urls = [];

  if (body.retainedImagePublicIds !== undefined) {
    publicIds = parseJsonField(
      body.retainedImagePublicIds,
      "retained image IDs",
    );
  }

  if (body.retainedImageUrls !== undefined) {
    urls = parseJsonField(body.retainedImageUrls, "retained image URLs");
  }

  if (
    !Array.isArray(publicIds) ||
    !publicIds.every((id) => typeof id === "string" && id.trim())
  ) {
    throw new AppError("Invalid retained image IDs.", 400);
  }

  if (
    !Array.isArray(urls) ||
    !urls.every((url) => typeof url === "string" && url.trim())
  ) {
    throw new AppError("Invalid retained image URLs.", 400);
  }

  return {
    publicIds: new Set(publicIds),
    urls: new Set(urls),
  };
};

const getRemovalPublicIds = (body) => {
  if (body.removeImagePublicIds === undefined) {
    return new Set();
  }

  const ids = parseJsonField(body.removeImagePublicIds, "image removal IDs");

  if (
    !Array.isArray(ids) ||
    !ids.every((id) => typeof id === "string" && id.trim())
  ) {
    throw new AppError("Invalid image removal IDs.", 400);
  }

  return new Set(ids);
};

// ============================================
// FEATURED DESTINATION HELPERS
// ============================================

const validateFeaturedOrder = (isFeatured, featuredOrder) => {
  if (!isFeatured) return null;

  if (
    !Number.isInteger(featuredOrder) ||
    featuredOrder < 1 ||
    featuredOrder > MAX_FEATURED_DESTINATIONS
  ) {
    throw new AppError(
      "Featured destinations must have an order between 1 and 4.",
      400,
    );
  }

  return featuredOrder;
};

const ensureFeaturedSlotAvailable = async (featuredOrder, excludeId = null) => {
  const query = {
    isFeatured: true,
    isPublished: true,
    featuredOrder,
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const existing = await Destination.findOne(query).select("_id name");

  if (existing) {
    throw new AppError(
      `Homepage position ${featuredOrder} is already assigned. Choose another position.`,
      409,
    );
  }
};

// ============================================
// GLOBAL DESTINATION DISPLAY ORDER
// ============================================

// Older destinations may not have a displayOrder yet. Assign positions to
// those records while leaving existing positions unchanged.
// The initial backfill follows the previous public listing order: newest first.
//
// Cache the initialization promise so concurrent requests share one backfill
// and successful initialization is not repeated on every public/admin request.
// If initialization fails, clear the promise so a later request can retry.
let displayOrderInitializationPromise = null;

const ensureDisplayOrdersInitialized = () => {
  if (!displayOrderInitializationPromise) {
    displayOrderInitializationPromise = (async () => {
      const destinationsWithoutOrder = await Destination.find({
        $or: [
          { displayOrder: { $exists: false } },
          { displayOrder: null },
          { displayOrder: { $not: { $type: "number" } } },
        ],
      })
        .sort({ createdAt: -1, _id: -1 })
        .select("_id displayOrder");

      if (!destinationsWithoutOrder.length) return;

      const lastOrderedDestination = await Destination.findOne({
        displayOrder: { $type: "number" },
      })
        .sort({ displayOrder: -1 })
        .select("displayOrder");

      let nextOrder = Number.isFinite(lastOrderedDestination?.displayOrder)
        ? lastOrderedDestination.displayOrder + 1
        : 0;

      const operations = destinationsWithoutOrder.map((destination) => ({
        updateOne: {
          filter: { _id: destination._id },
          update: { $set: { displayOrder: nextOrder++ } },
        },
      }));

      await Destination.bulkWrite(operations);
    })().catch((error) => {
      displayOrderInitializationPromise = null;
      throw error;
    });
  }

  return displayOrderInitializationPromise;
};

// ============================================
// GET ALL PUBLISHED DESTINATIONS
// GET /api/v1/destinations
// ============================================

exports.getAllDestinations = catchAsync(async (req, res) => {
  await ensureDisplayOrdersInitialized();

  const destinations = await getOrSet("destinations:published", () =>
    Destination.find({
      isPublished: true,
    }).sort({ displayOrder: 1, createdAt: -1, _id: 1 }),
  );

  res.status(200).json({
    status: "success",
    results: destinations.length,
    data: { destinations },
  });
});

// ============================================
// GET FEATURED DESTINATIONS
// GET /api/v1/destinations/featured
// ============================================

exports.getFeaturedDestinations = catchAsync(async (req, res) => {
  const destinations = await getOrSet("destinations:featured", () =>
    Destination.find({
      isPublished: true,
      isFeatured: true,
      featuredOrder: {
        $gte: 1,
        $lte: MAX_FEATURED_DESTINATIONS,
      },
    })
      .sort({ featuredOrder: 1 })
      .limit(MAX_FEATURED_DESTINATIONS),
  );

  res.status(200).json({
    status: "success",
    results: destinations.length,
    data: { destinations },
  });
});

// ============================================
// GET ONE DESTINATION BY SLUG OR MONGODB ID
// GET /api/v1/destinations/:id
// ============================================

exports.getDestination = catchAsync(async (req, res, next) => {
  const identifier = String(req.params.id || "").trim();

  if (!identifier) {
    return next(new AppError("A destination ID or slug is required.", 400));
  }

  const isObjectId = /^[a-f\d]{24}$/i.test(identifier);

  const query = isObjectId
    ? {
        $or: [{ _id: identifier }, { slug: identifier }],
        isPublished: true,
      }
    : {
        slug: identifier,
        isPublished: true,
      };

  const destination = await getOrSet(
    `destination:${identifier.toLowerCase()}`,
    () => Destination.findOne(query),
  );

  if (!destination) {
    return next(
      new AppError("No destination found with that ID or slug.", 404),
    );
  }

  res.status(200).json({
    status: "success",
    data: { destination },
  });
});

// ============================================
// GET ALL DESTINATIONS FOR ADMIN
// GET /api/v1/destinations/admin
// ============================================

exports.getAllDestinationsAdmin = catchAsync(async (req, res) => {
  await ensureDisplayOrdersInitialized();

  const destinations = await Destination.find().sort({
    displayOrder: 1,
    createdAt: -1,
    _id: 1,
  });

  res.status(200).json({
    status: "success",
    results: destinations.length,
    data: { destinations },
  });
});

// ============================================
// CREATE DESTINATION
// POST /api/v1/destinations
// ============================================

exports.createDestination = catchAsync(async (req, res) => {
  const destinationData = prepareDestinationData(req.body);
  const uploadedImages = [];
  let destination;

  try {
    const coverFiles = getUploadedFiles(req.files, "coverImage");
    const galleryFiles = getUploadedFiles(req.files, "images");

    if (coverFiles.length > 1) {
      throw new AppError("Upload only one cover image.", 400);
    }

    const coverUploads = await uploadDestinationImages(coverFiles);
    uploadedImages.push(...coverUploads);

    const galleryUploads = await uploadDestinationImages(galleryFiles);
    uploadedImages.push(...galleryUploads);

    let coverImage = coverUploads[0]?.url || "";
    let galleryImages = galleryUploads;

    // Support older clients that upload all images using the "images" field.
    if (coverFiles.length === 0 && galleryUploads.length) {
      coverImage = galleryUploads[0].url;
      galleryImages = galleryUploads.slice(1);
    }

    if (coverImage) {
      destinationData.coverImage = coverImage;
    }

    if (galleryImages.length) {
      destinationData.images = galleryImages;
    }

    if (!destinationData.coverImage) {
      throw new AppError("Please upload a cover image.", 400);
    }

    destinationData.slug = createSlug(destinationData.name);

    if (destinationData.isFeatured) {
      if (!destinationData.isPublished) {
        throw new AppError(
          "Publish a destination before featuring it on the homepage.",
          400,
        );
      }

      destinationData.featuredOrder = validateFeaturedOrder(
        true,
        destinationData.featuredOrder,
      );

      await ensureFeaturedSlotAvailable(destinationData.featuredOrder);
    } else {
      destinationData.featuredOrder = null;
    }

    // Assign the new destination the next global position.
    // This is independent of isFeatured and featuredOrder.
    await ensureDisplayOrdersInitialized();

    const lastOrderedDestination = await Destination.findOne({
      displayOrder: { $type: "number" },
    })
      .sort({ displayOrder: -1 })
      .select("displayOrder");

    destinationData.displayOrder = Number.isFinite(
      lastOrderedDestination?.displayOrder,
    )
      ? lastOrderedDestination.displayOrder + 1
      : 0;

    destination = await Destination.create({
      ...destinationData,
      createdBy: req.user?._id,
    });

    invalidateDestinationCache();

    res.status(201).json({
      status: "success",
      data: { destination },
    });
  } catch (error) {
    if (destination?._id) {
      await Destination.findByIdAndDelete(destination._id).catch(() => {});
    }

    await deleteCloudinaryImages(uploadedImages);
    throw error;
  }
});

// ============================================
// REORDER ALL DESTINATIONS
// PATCH /api/v1/destinations/reorder
// Body: { "destinationIds": ["<id>", "<id>", ...] }
// ============================================

exports.reorderDestinations = catchAsync(async (req, res) => {
  const { destinationIds } = req.body || {};

  if (!Array.isArray(destinationIds) || destinationIds.length === 0) {
    throw new AppError("Provide the ordered destinationIds array.", 400);
  }

  if (
    !destinationIds.every(
      (id) => typeof id === "string" && /^[a-f\d]{24}$/i.test(id),
    )
  ) {
    throw new AppError("One or more destination IDs are invalid.", 400);
  }

  const normalizedIds = destinationIds.map((id) => id.toLowerCase());
  const uniqueIds = new Set(normalizedIds);

  if (uniqueIds.size !== normalizedIds.length) {
    throw new AppError("The destination order contains duplicate IDs.", 400);
  }

  await ensureDisplayOrdersInitialized();

  const allDestinations = await Destination.find().select("_id");

  const existingIds = new Set(
    allDestinations.map((destination) => String(destination._id).toLowerCase()),
  );

  if (normalizedIds.length !== existingIds.size) {
    throw new AppError(
      "The order must include every destination exactly once. Refresh the list and try again.",
      409,
    );
  }

  for (const id of normalizedIds) {
    if (!existingIds.has(id)) {
      throw new AppError(
        "A destination in the order no longer exists. Refresh the list and try again.",
        409,
      );
    }
  }

  await Destination.bulkWrite(
    normalizedIds.map((id, displayOrder) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { displayOrder } },
      },
    })),
  );

  invalidateDestinationCache();

  const destinations = await Destination.find().sort({
    displayOrder: 1,
    createdAt: -1,
    _id: 1,
  });

  res.status(200).json({
    status: "success",
    message: "Destination order saved successfully.",
    results: destinations.length,
    data: { destinations },
  });
});

// ============================================
// UPDATE DESTINATION
// PATCH /api/v1/destinations/:id
// ============================================

exports.updateDestination = catchAsync(async (req, res, next) => {
  const existingDestination = await Destination.findById(req.params.id);

  if (!existingDestination) {
    return next(new AppError("No destination found with that ID.", 404));
  }

  const uploadedImages = [];

  try {
    const updateData = prepareDestinationData(
      req.body,
      existingDestination.location,
    );

    const coverFiles = getUploadedFiles(req.files, "coverImage");
    const galleryFiles = getUploadedFiles(req.files, "images");

    if (coverFiles.length > 1) {
      throw new AppError("Upload only one cover image.", 400);
    }

    const coverUploads = await uploadDestinationImages(coverFiles);
    uploadedImages.push(...coverUploads);

    const galleryUploads = await uploadDestinationImages(galleryFiles);
    uploadedImages.push(...galleryUploads);

    const existingImages = existingDestination.images || [];

    let retainedImages = existingImages;

    const hasRetentionInformation =
      req.body.retainedImagePublicIds !== undefined ||
      req.body.retainedImageUrls !== undefined;

    if (hasRetentionInformation) {
      const { publicIds, urls } = getRetainedImageLists(req.body);

      const knownPublicIds = new Set(
        existingImages.map((image) => image.publicId).filter(Boolean),
      );

      const knownUrls = new Set(existingImages.map((image) => image.url));

      for (const id of publicIds) {
        if (!knownPublicIds.has(id)) {
          throw new AppError(
            "An image does not belong to this destination.",
            400,
          );
        }
      }

      for (const url of urls) {
        if (!knownUrls.has(url)) {
          throw new AppError(
            "An image URL does not belong to this destination.",
            400,
          );
        }
      }

      retainedImages = existingImages.filter((image) =>
        image.publicId ? publicIds.has(image.publicId) : urls.has(image.url),
      );
    }

    const removalIds = getRemovalPublicIds(req.body);

    for (const id of removalIds) {
      if (!existingImages.some((image) => image.publicId === id)) {
        throw new AppError(
          "An image selected for removal does not belong to this destination.",
          400,
        );
      }
    }

    if (removalIds.size) {
      retainedImages = retainedImages.filter(
        (image) => !removalIds.has(image.publicId),
      );
    }

    const finalImages = [...retainedImages, ...galleryUploads];

    updateData.images = finalImages;

    if (coverUploads.length) {
      updateData.coverImage = coverUploads[0].url;
    } else if (req.body.coverImage !== undefined) {
      const requestedCover = String(req.body.coverImage).trim();

      const knownCover =
        requestedCover === existingDestination.coverImage ||
        existingImages.some((image) => image.url === requestedCover);

      if (requestedCover && !knownCover) {
        throw new AppError(
          "The selected cover image does not belong to this destination.",
          400,
        );
      }

      updateData.coverImage = requestedCover;
    } else {
      updateData.coverImage = existingDestination.coverImage || "";
    }

    if (updateData.name) {
      updateData.slug = createSlug(updateData.name);
    }

    const nextIsPublished =
      updateData.isPublished ?? existingDestination.isPublished;

    const nextIsFeatured =
      updateData.isFeatured ?? existingDestination.isFeatured;

    const nextFeaturedOrder =
      updateData.featuredOrder !== undefined
        ? updateData.featuredOrder
        : existingDestination.featuredOrder;

    if (nextIsFeatured) {
      if (!nextIsPublished) {
        throw new AppError(
          "A draft destination cannot be featured on the homepage.",
          400,
        );
      }

      updateData.isFeatured = true;

      updateData.featuredOrder = validateFeaturedOrder(true, nextFeaturedOrder);

      await ensureFeaturedSlotAvailable(
        updateData.featuredOrder,
        existingDestination._id,
      );
    } else if (
      updateData.isFeatured === false ||
      updateData.isPublished === false
    ) {
      updateData.isFeatured = false;
      updateData.featuredOrder = null;
    }

    const destination = await Destination.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!destination) {
      throw new AppError("Destination could not be updated.", 404);
    }

    invalidateDestinationCache();

    const finalPublicIds = new Set(
      finalImages.map((image) => image.publicId).filter(Boolean),
    );

    const removedGalleryImages = existingImages.filter(
      (image) => image.publicId && !finalPublicIds.has(image.publicId),
    );

    const removedCoverImages =
      coverUploads.length &&
      existingDestination.coverImage &&
      existingDestination.coverImage !== destination.coverImage
        ? [
            {
              publicId: existingImages.find(
                (image) => image.url === existingDestination.coverImage,
              )?.publicId,
            },
          ]
        : [];

    await deleteCloudinaryImages([
      ...removedGalleryImages,
      ...removedCoverImages,
    ]);

    res.status(200).json({
      status: "success",
      data: { destination },
    });
  } catch (error) {
    await deleteCloudinaryImages(uploadedImages);
    throw error;
  }
});

// ============================================
// DELETE DESTINATION
// DELETE /api/v1/destinations/:id
// ============================================

exports.deleteDestination = catchAsync(async (req, res, next) => {
  const destination = await Destination.findById(req.params.id);

  if (!destination) {
    return next(new AppError("No destination found with that ID.", 404));
  }

  await Destination.findByIdAndDelete(req.params.id);

  invalidateDestinationCache();

  const imagesToDelete = [...(destination.images || [])];

  if (
    destination.coverImage &&
    !imagesToDelete.some((image) => image.url === destination.coverImage)
  ) {
    imagesToDelete.push({
      url: destination.coverImage,
    });
  }

  await deleteCloudinaryImages(imagesToDelete);

  res.status(204).end();
});
