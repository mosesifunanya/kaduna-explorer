const mongoose = require("mongoose");

const Event = require("../models/eventModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const cloudinary = require("../config/cloudinary");

const ENDED_EVENT_RETENTION_MS = 24 * 60 * 60 * 1000;
const STARTING_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;

// ============================================
// CLOUDINARY IMAGE HELPERS
// ============================================

const uploadToCloudinary = (fileBuffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "kaduna-explorer/events",
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

const deleteCloudinaryImages = async (publicIds = []) => {
  const uniquePublicIds = [
    ...new Set(
      publicIds.filter(
        (publicId) => typeof publicId === "string" && publicId.trim(),
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
        `Failed to delete Cloudinary image ${uniquePublicIds[index]}:`,
        result.reason,
      );
    }
  });
};

// ============================================
// REQUEST HELPERS
// ============================================

const getUploadedFiles = (files, fieldName) => {
  if (!Array.isArray(files)) return [];

  return files.filter((file) => file.fieldname === fieldName);
};

const validateUploadedFiles = (files, fieldName) => {
  const invalidFile = files.find(
    (file) => !file || !Buffer.isBuffer(file.buffer) || !file.buffer.length,
  );

  if (invalidFile) {
    throw new AppError(
      `One or more uploaded ${fieldName} images are invalid.`,
      400,
    );
  }
};

const parseBoolean = (value, fieldName) => {
  if (typeof value === "boolean") return value;

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;

  throw new AppError(`Invalid ${fieldName}.`, 400);
};

const parseString = (value, fieldName, options = {}) => {
  if (value === undefined || value === null) return undefined;

  if (typeof value !== "string") {
    throw new AppError(`Invalid ${fieldName}.`, 400);
  }

  const parsed = value.trim();

  if (options.required && !parsed) {
    throw new AppError(`${fieldName} is required.`, 400);
  }

  return parsed;
};

// ============================================
// DATE PARSER
// Supports date-only and timezone-aware datetime values.
// Date-only values use Africa/Lagos (UTC+1).
// ============================================

const parseDate = (value, fieldName, options = {}) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(`${fieldName} is required.`, 400);
  }

  const dateValue = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [year, month, day] = dateValue.split("-").map(Number);

    const calendarCheck = new Date(Date.UTC(year, month - 1, day));

    if (
      calendarCheck.getUTCFullYear() !== year ||
      calendarCheck.getUTCMonth() !== month - 1 ||
      calendarCheck.getUTCDate() !== day
    ) {
      throw new AppError(`Invalid ${fieldName}.`, 400);
    }

    // Nigeria is UTC+1.
    // Start date: midnight at the beginning of the local day.
    // End date: the final millisecond of the local day.
    return options.endOfDay
      ? new Date(Date.UTC(year, month - 1, day, 22, 59, 59, 999))
      : new Date(Date.UTC(year, month - 1, day, 23, 0, 0, 0));
  }

  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(dateValue);

  if (!hasTimezone) {
    throw new AppError(
      `${fieldName} must include a timezone offset. Submit an ISO timestamp with Z or an explicit offset.`,
      400,
    );
  }

  const parsed = new Date(dateValue);

  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`Invalid ${fieldName}.`, 400);
  }

  return parsed;
};

const parseHighlights = (value) => {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  let highlights = value;

  if (typeof value === "string") {
    try {
      highlights = JSON.parse(value);
    } catch {
      throw new AppError("Invalid event highlights JSON.", 400);
    }
  }

  if (
    !Array.isArray(highlights) ||
    !highlights.every(
      (item) =>
        typeof item === "string" &&
        item.trim().length > 0 &&
        item.trim().length <= 250,
    )
  ) {
    throw new AppError(
      "Event highlights must be a list of valid text items.",
      400,
    );
  }

  return highlights.map((item) => item.trim());
};

const validateWebUrl = (value, fieldName, required = false) => {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw new AppError(`${fieldName} is required.`, 400);
    }

    return "";
  }

  if (typeof value !== "string") {
    throw new AppError(`${fieldName} must be a valid URL.`, 400);
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new AppError(`${fieldName} must be a valid URL.`, 400);
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new AppError(`${fieldName} must use HTTP or HTTPS.`, 400);
  }

  return parsedUrl.toString();
};

const isValidDocumentId = (id) =>
  typeof id === "string" && mongoose.isValidObjectId(id);

const createSlugBase = (title) =>
  title
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const generateUniqueSlug = async (value, excludeId = null) => {
  const baseSlug = createSlugBase(value);

  if (!baseSlug) {
    throw new AppError("The event title cannot produce a valid URL slug.", 400);
  }

  let slug = baseSlug;
  let suffix = 1;

  while (true) {
    const query = { slug };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existingEvent = await Event.findOne(query).select("_id");

    if (!existingEvent) return slug;

    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }
};

// ============================================
// GALLERY IMAGE HELPERS
// ============================================

const parseGalleryImages = (value) => {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  let images = value;

  if (typeof value === "string") {
    try {
      images = JSON.parse(value);
    } catch {
      throw new AppError("Invalid event gallery images JSON.", 400);
    }
  }

  if (!Array.isArray(images)) {
    throw new AppError("Event gallery images must be provided as a list.", 400);
  }

  return images.map((image) => {
    if (typeof image === "string") {
      return {
        url: validateWebUrl(image, "Gallery image URL", true),
        publicId: "",
        alt: "",
      };
    }

    if (!image || typeof image !== "object" || Array.isArray(image)) {
      throw new AppError("Invalid event gallery image.", 400);
    }

    const url = validateWebUrl(image.url, "Gallery image URL", true);

    const alt = parseString(
      image.alt === undefined ? "" : image.alt,
      "Gallery image alt text",
    );

    return {
      url,
      publicId: typeof image.publicId === "string" ? image.publicId.trim() : "",
      alt: alt || "",
    };
  });
};

const reconcileGalleryImages = (submittedImages, existingImages = []) => {
  const existingByPublicId = new Map();
  const existingByUrl = new Map();

  existingImages.forEach((image) => {
    if (image.publicId) {
      existingByPublicId.set(image.publicId, image);
    }

    if (image.url) {
      existingByUrl.set(image.url, image);
    }
  });

  return submittedImages.map((image) => {
    const existing =
      (image.publicId && existingByPublicId.get(image.publicId)) ||
      existingByUrl.get(image.url);

    if (existing) {
      return {
        url: existing.url,
        publicId: existing.publicId || "",
        alt: image.alt || existing.alt || "",
      };
    }

    if (image.publicId) {
      throw new AppError("A gallery image does not belong to this event.", 400);
    }

    return {
      url: image.url,
      publicId: "",
      alt: image.alt || "",
    };
  });
};

const uploadGalleryImages = async (files, uploadedPublicIds) => {
  const uploadedImages = [];

  for (const file of files) {
    const result = await uploadToCloudinary(file.buffer);

    uploadedPublicIds.push(result.public_id);

    uploadedImages.push({
      url: result.secure_url,
      publicId: result.public_id,
      alt: "",
    });
  }

  return uploadedImages;
};

const getRemovedGalleryPublicIds = (oldImages = [], newImages = []) => {
  const retainedPublicIds = new Set(
    newImages.map((image) => image.publicId).filter(Boolean),
  );

  return oldImages
    .map((image) => image.publicId)
    .filter((publicId) => publicId && !retainedPublicIds.has(publicId));
};

// ============================================
// EVENT LIFECYCLE
// ============================================

const getEventStatus = (event, now = Date.now()) => {
  const startTime = new Date(event.startDate).getTime();
  const endTime = new Date(event.endDate).getTime();

  if (now > endTime) {
    return "ended";
  }

  if (now >= startTime) {
    return "live";
  }

  if (startTime - now <= STARTING_SOON_WINDOW_MS) {
    return "starting-soon";
  }

  return "upcoming";
};

const serializeEvent = (event, now = Date.now()) => {
  const data =
    typeof event.toObject === "function" ? event.toObject() : { ...event };

  const endTime = new Date(data.endDate).getTime();

  return {
    ...data,
    eventStatus: getEventStatus(data, now),
    expired: now > endTime + ENDED_EVENT_RETENTION_MS,
  };
};

// ============================================
// EVENT DATE VALIDATION
// ============================================

const validateEventDates = (startDate, endDate) => {
  if (endDate <= startDate) {
    throw new AppError(
      "Event end date and time must be after the start date and time.",
      400,
    );
  }
};

// ============================================
// PREPARE EVENT DATA
// ============================================

const prepareEventData = (body, existingEvent = null) => {
  const data = {};

  const stringFields = [
    "title",
    "description",
    "shortDescription",
    "category",
    "categoryLabel",
    "venue",
    "address",
    "city",
    "lga",
    "state",
    "timezone",
    "organiser",
    "organiserDescription",
    "organiserWebsite",
    "organiserEmail",
    "organiserPhone",
    "ticketInformation",
  ];

  for (const field of stringFields) {
    if (body[field] !== undefined) {
      data[field] = parseString(body[field], field, {
        required: [
          "title",
          "description",
          "category",
          "venue",
          "address",
        ].includes(field),
      });
    }
  }

  if (data.category !== undefined) {
    data.category = data.category.toLowerCase().replace(/[\s_]+/g, "-");

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.category)) {
      throw new AppError("Invalid event category.", 400);
    }
  }

  if (body.highlights !== undefined) {
    data.highlights = parseHighlights(body.highlights);
  }

  if (body.startDate !== undefined) {
    data.startDate = parseDate(body.startDate, "Event start date");
  }

  if (body.endDate !== undefined) {
    data.endDate = parseDate(body.endDate, "Event end date", {
      endOfDay: /^\d{4}-\d{2}-\d{2}$/.test(body.endDate.trim()),
    });
  }

  const finalStartDate = data.startDate || existingEvent?.startDate;
  const finalEndDate = data.endDate || existingEvent?.endDate;

  if (finalStartDate && finalEndDate) {
    validateEventDates(finalStartDate, finalEndDate);
  }

  if (body.isPublished !== undefined) {
    data.isPublished = parseBoolean(body.isPublished, "publication status");
  }

  // FEATURED EXPERIENCE STATUS
  // Preserve the existing value when this field is omitted during an update.
  if (body.isFeatured !== undefined) {
    data.isFeatured = parseBoolean(body.isFeatured, "featured status");
  }

  if (body.ticketUrl !== undefined) {
    data.ticketUrl = validateWebUrl(body.ticketUrl, "Ticket URL");
  }

  if (body.registrationUrl !== undefined) {
    data.registrationUrl = validateWebUrl(
      body.registrationUrl,
      "Registration URL",
    );
  }

  if (body.organiserWebsite !== undefined) {
    data.organiserWebsite = validateWebUrl(
      body.organiserWebsite,
      "Organiser website",
    );
  }

  if (body.slug !== undefined) {
    const requestedSlug = parseString(body.slug, "Event slug", {
      required: true,
    });

    const normalizedSlug = createSlugBase(requestedSlug);

    if (!normalizedSlug) {
      throw new AppError("Please provide a valid event slug.", 400);
    }

    data.slug = normalizedSlug;
  }

  if (body.latitude !== undefined || body.longitude !== undefined) {
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);

    if (
      body.latitude === undefined ||
      body.longitude === undefined ||
      body.latitude === "" ||
      body.longitude === "" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new AppError(
        "Provide valid latitude and longitude coordinates.",
        400,
      );
    }

    data.location = {
      type: "Point",
      coordinates: [longitude, latitude],
    };
  }

  return data;
};

// ============================================
// PUBLIC EVENT LISTING
// GET /api/v1/events
// ============================================

exports.getAllEvents = catchAsync(async (req, res) => {
  const now = new Date();

  const retentionBoundary = new Date(now.getTime() - ENDED_EVENT_RETENTION_MS);

  const events = await Event.find({
    isPublished: true,
    endDate: { $gte: retentionBoundary },
  }).sort({
    startDate: 1,
    createdAt: -1,
  });

  return res.status(200).json({
    status: "success",
    results: events.length,
    data: {
      events: events.map((event) => serializeEvent(event, now.getTime())),
    },
  });
});

// ============================================
// PUBLIC SINGLE EVENT
// GET /api/v1/events/:id
// ============================================

exports.getEvent = catchAsync(async (req, res, next) => {
  const identifier = String(req.params.id || "").trim();

  if (!identifier) {
    return next(new AppError("An event ID or slug is required.", 400));
  }

  const now = Date.now();

  const retentionBoundary = new Date(now - ENDED_EVENT_RETENTION_MS);

  const isObjectId = /^[a-f\d]{24}$/i.test(identifier);

  const query = {
    isPublished: true,
    endDate: { $gte: retentionBoundary },
    ...(isObjectId
      ? {
          $or: [{ _id: identifier }, { slug: identifier }],
        }
      : { slug: identifier }),
  };

  const event = await Event.findOne(query);

  if (!event) {
    return next(
      new AppError("No published event found with that ID or slug.", 404),
    );
  }

  return res.status(200).json({
    status: "success",
    data: {
      event: serializeEvent(event, now),
    },
  });
});

// ============================================
// ADMIN EVENT LISTING
// GET /api/v1/events/admin
// ============================================

exports.getAllEventsAdmin = catchAsync(async (req, res) => {
  const now = Date.now();

  const events = await Event.find().sort({
    startDate: -1,
    createdAt: -1,
  });

  return res.status(200).json({
    status: "success",
    results: events.length,
    data: {
      events: events.map((event) => serializeEvent(event, now)),
    },
  });
});

// ============================================
// ADMIN SINGLE EVENT
// GET /api/v1/events/admin/:id
// ============================================

exports.getEventAdmin = catchAsync(async (req, res, next) => {
  if (!isValidDocumentId(req.params.id)) {
    return next(new AppError("Please provide a valid event ID.", 400));
  }

  const event = await Event.findById(req.params.id);

  if (!event) {
    return next(new AppError("No event found with that ID.", 404));
  }

  return res.status(200).json({
    status: "success",
    data: {
      event: serializeEvent(event),
    },
  });
});

// ============================================
// CREATE EVENT
// POST /api/v1/events
// ============================================

exports.createEvent = catchAsync(async (req, res) => {
  const eventData = prepareEventData(req.body);

  const uploadedPublicIds = [];

  let createdEvent;

  try {
    const coverFiles = getUploadedFiles(req.files, "coverImage");
    const galleryFiles = getUploadedFiles(req.files, "images");

    if (coverFiles.length > 1) {
      throw new AppError("Upload only one event cover image.", 400);
    }

    validateUploadedFiles(coverFiles, "cover");
    validateUploadedFiles(galleryFiles, "gallery");

    let coverImage = validateWebUrl(req.body.coverImage, "Event cover image");

    let coverImagePublicId = "";

    if (coverFiles.length) {
      const uploadResult = await uploadToCloudinary(coverFiles[0].buffer);

      coverImage = uploadResult.secure_url;
      coverImagePublicId = uploadResult.public_id;

      uploadedPublicIds.push(coverImagePublicId);
    }

    if (!coverImage) {
      throw new AppError(
        "Please provide an event cover image URL or upload an image.",
        400,
      );
    }

    eventData.coverImage = coverImage;
    eventData.coverImagePublicId = coverImagePublicId;

    if (!eventData.title || !eventData.description) {
      throw new AppError("Event title and description are required.", 400);
    }

    if (!eventData.category || !eventData.venue || !eventData.address) {
      throw new AppError(
        "Event category, venue and address are required.",
        400,
      );
    }

    if (!eventData.startDate || !eventData.endDate) {
      throw new AppError("Event start and end dates are required.", 400);
    }

    const requestedGalleryImages = parseGalleryImages(req.body.images);

    const uploadedGalleryImages = await uploadGalleryImages(
      galleryFiles,
      uploadedPublicIds,
    );

    eventData.images = [...requestedGalleryImages, ...uploadedGalleryImages];

    eventData.slug = await generateUniqueSlug(
      eventData.slug || eventData.title,
    );

    if (eventData.isPublished) {
      eventData.publishedAt = new Date();
    }

    createdEvent = await Event.create({
      ...eventData,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      status: "success",
      data: {
        event: serializeEvent(createdEvent),
      },
    });
  } catch (error) {
    if (createdEvent?._id) {
      await Event.findByIdAndDelete(createdEvent._id).catch(() => {});
    }

    await deleteCloudinaryImages(uploadedPublicIds);

    throw error;
  }
});

// ============================================
// UPDATE EVENT
// PATCH /api/v1/events/:id
// ============================================

exports.updateEvent = catchAsync(async (req, res, next) => {
  if (!isValidDocumentId(req.params.id)) {
    return next(new AppError("Please provide a valid event ID.", 400));
  }

  const event = await Event.findById(req.params.id);

  if (!event) {
    return next(new AppError("No event found with that ID.", 404));
  }

  const updates = prepareEventData(req.body, event);

  const uploadedPublicIds = [];

  const coverFiles = getUploadedFiles(req.files, "coverImage");
  const galleryFiles = getUploadedFiles(req.files, "images");

  if (coverFiles.length > 1) {
    throw new AppError("Upload only one event cover image.", 400);
  }

  validateUploadedFiles(coverFiles, "cover");
  validateUploadedFiles(galleryFiles, "gallery");

  const oldCoverPublicId = event.coverImagePublicId;

  const oldGalleryImages = (event.images || []).map((image) => ({
    url: image.url,
    publicId: image.publicId || "",
    alt: image.alt || "",
  }));

  let eventSaved = false;

  try {
    // COVER IMAGE

    if (coverFiles.length) {
      const uploadResult = await uploadToCloudinary(coverFiles[0].buffer);

      updates.coverImage = uploadResult.secure_url;
      updates.coverImagePublicId = uploadResult.public_id;

      uploadedPublicIds.push(uploadResult.public_id);
    } else if (req.body.coverImage !== undefined) {
      updates.coverImage = validateWebUrl(
        req.body.coverImage,
        "Event cover image",
        true,
      );

      updates.coverImagePublicId = "";
    }

    // GALLERY IMAGES

    let retainedGalleryImages = oldGalleryImages;

    if (req.body.images !== undefined) {
      const submittedImages = parseGalleryImages(req.body.images);

      retainedGalleryImages = reconcileGalleryImages(
        submittedImages,
        oldGalleryImages,
      );
    }

    const uploadedGalleryImages = await uploadGalleryImages(
      galleryFiles,
      uploadedPublicIds,
    );

    if (req.body.images !== undefined || galleryFiles.length) {
      updates.images = [...retainedGalleryImages, ...uploadedGalleryImages];
    }

    // SLUG

    if (updates.slug !== undefined) {
      updates.slug = await generateUniqueSlug(updates.slug, event._id);
    }

    // PUBLICATION STATUS

    if (updates.isPublished === true && !event.isPublished) {
      updates.publishedAt = new Date();
    }

    if (updates.isPublished === false) {
      updates.publishedAt = null;
    }

    // SAVE EVENT

    Object.assign(event, updates);

    await event.save();

    eventSaved = true;

    // CLEAN UP REPLACED IMAGES

    const newCoverPublicId = event.coverImagePublicId;

    if (oldCoverPublicId && oldCoverPublicId !== newCoverPublicId) {
      await deleteCloudinaryImages([oldCoverPublicId]);
    }

    const newGalleryImages = (event.images || []).map((image) => ({
      url: image.url,
      publicId: image.publicId || "",
      alt: image.alt || "",
    }));

    const removedGalleryPublicIds = getRemovedGalleryPublicIds(
      oldGalleryImages,
      newGalleryImages,
    );

    await deleteCloudinaryImages(removedGalleryPublicIds);

    return res.status(200).json({
      status: "success",
      data: {
        event: serializeEvent(event),
      },
    });
  } catch (error) {
    if (!eventSaved) {
      await deleteCloudinaryImages(uploadedPublicIds);
    }

    throw error;
  }
});

// ============================================
// AUTOMATIC EXPIRED EVENT CLEANUP
// Deletes events 24 hours after their endDate and
// processes their Cloudinary cover and gallery images.
// ============================================

exports.cleanupExpiredEvents = async () => {
  const retentionBoundary = new Date(Date.now() - ENDED_EVENT_RETENTION_MS);

  // Find candidates first. Recheck the expiry condition during each
  // atomic deletion so an event with an extended endDate is protected.
  const expiredEvents = await Event.find({
    endDate: { $lte: retentionBoundary },
  }).select("_id");

  if (!expiredEvents.length) return 0;

  let deletedCount = 0;
  const publicIdsToDelete = [];

  for (const candidate of expiredEvents) {
    const deletedEvent = await Event.findOneAndDelete({
      _id: candidate._id,
      endDate: { $lte: retentionBoundary },
    });

    if (!deletedEvent) continue;

    deletedCount += 1;

    if (deletedEvent.coverImagePublicId) {
      publicIdsToDelete.push(deletedEvent.coverImagePublicId);
    }

    for (const image of deletedEvent.images || []) {
      if (image.publicId) {
        publicIdsToDelete.push(image.publicId);
      }
    }
  }

  // Delete Cloudinary assets only for events actually removed from MongoDB.
  await deleteCloudinaryImages(publicIdsToDelete);

  if (deletedCount > 0) {
    console.log(
      `Expired event cleanup: deleted ${deletedCount} event(s) and processed their Cloudinary images.`,
    );
  }

  return deletedCount;
};

// ============================================
// DELETE EVENT
// DELETE /api/v1/events/:id
// ============================================

exports.deleteEvent = catchAsync(async (req, res, next) => {
  if (!isValidDocumentId(req.params.id)) {
    return next(new AppError("Please provide a valid event ID.", 400));
  }

  const event = await Event.findById(req.params.id);

  if (!event) {
    return next(new AppError("No event found with that ID.", 404));
  }

  const publicIds = [
    event.coverImagePublicId,
    ...(event.images || []).map((image) => image.publicId),
  ].filter(Boolean);

  await Event.findByIdAndDelete(event._id);

  await deleteCloudinaryImages(publicIds);

  return res.status(204).end();
});
