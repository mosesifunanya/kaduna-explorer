const mongoose = require("mongoose");

const Review = require("../models/reviewModel");
const Destination = require("../models/destinationModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const cloudinary = require("../config/cloudinary");
const { invalidateDestinationCache } = require("../utils/destinationCache");

// Recalculate a destination's average rating and total reviews.
const updateDestinationRating = async (destinationId) => {
  const stats = await Review.aggregate([
    {
      $match: {
        destination: destinationId,
      },
    },
    {
      $group: {
        _id: "$destination",
        averageRating: { $avg: "$rating" },
        ratingsCount: { $sum: 1 },
      },
    },
  ]);

  await Destination.findByIdAndUpdate(destinationId, {
    $set: {
      averageRating:
        stats.length > 0 ? Math.round(stats[0].averageRating * 10) / 10 : 0,
      ratingsCount: stats.length > 0 ? stats[0].ratingsCount : 0,
    },
  });

  invalidateDestinationCache();
};

// Populate review relationships consistently.
const populateReview = (query) =>
  query.populate("user", "name photo").populate("destination", "name slug");

// Upload one image buffer to Cloudinary.
const uploadToCloudinary = (fileBuffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "kaduna-explorer/reviews",
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);

        if (!result?.secure_url || !result?.public_id) {
          return reject(
            new Error("Cloudinary returned an incomplete image response."),
          );
        }

        resolve(result);
      },
    );

    stream.end(fileBuffer);
  });

// Delete Cloudinary images safely.
// Cleanup failures are logged but do not interrupt review operations.
const deleteCloudinaryImages = async (photos = []) => {
  const publicIds = [
    ...new Set(
      photos
        .map((photo) => (typeof photo === "string" ? photo : photo?.publicId))
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
        `Failed to delete Cloudinary review image ${publicIds[index]}:`,
        result.reason,
      );
    }
  });
};

// Upload review photos and return their database records.
const uploadReviewPhotos = async (files = []) => {
  if (!files.length) return [];

  for (const file of files) {
    if (!file?.buffer) {
      throw new AppError("An uploaded review photo is invalid.", 400);
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

  const uploadedPhotos = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  const failedUpload = results.find((result) => result.status === "rejected");

  if (failedUpload) {
    await deleteCloudinaryImages(uploadedPhotos);

    console.error(
      "Cloudinary review photo upload failed:",
      failedUpload.reason,
    );

    throw new AppError(
      "A review photo could not be uploaded. Check your backend terminal and Cloudinary configuration.",
      502,
    );
  }

  return uploadedPhotos;
};

// Parse photo removal IDs submitted through JSON or FormData.
const getRemovalPublicIds = (value) => {
  if (value === undefined || value === null || value === "") {
    return new Set();
  }

  let ids = value;

  if (typeof value === "string") {
    try {
      ids = JSON.parse(value);
    } catch {
      throw new AppError("Invalid review photo removal data.", 400);
    }
  }

  if (
    !Array.isArray(ids) ||
    !ids.every((id) => typeof id === "string" && id.trim().length > 0)
  ) {
    throw new AppError("Invalid review photo removal IDs.", 400);
  }

  return new Set(ids.map((id) => id.trim()));
};

// Build rating statistics from ALL matching reviews.
// Rating filters are deliberately excluded from this calculation.
const getReviewStatistics = async (baseFilter = {}) => {
  const statsMatch = { ...baseFilter };

  if (statsMatch.destination) {
    statsMatch.destination = new mongoose.Types.ObjectId(
      String(statsMatch.destination),
    );
  }

  const results = await Review.aggregate([
    {
      $match: statsMatch,
    },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
        ratingTotal: { $sum: "$rating" },
      },
    },
  ]);

  const ratingBreakdown = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  let totalReviews = 0;
  let ratingTotal = 0;

  results.forEach((item) => {
    ratingBreakdown[item._id] = item.count;
    totalReviews += item.count;
    ratingTotal += item.ratingTotal;
  });

  return {
    averageRating:
      totalReviews > 0 ? Math.round((ratingTotal / totalReviews) * 10) / 10 : 0,
    totalReviews,
    ratingBreakdown,
  };
};

// GET all reviews or reviews belonging to a destination.
//
// Supported query parameters:
// destination = destination MongoDB ID
// page        = page number
// limit       = reviews per page
// rating      = filter by 1, 2, 3, 4 or 5 stars
// sort        = newest, oldest, highest or lowest
//
// Pagination is optional to preserve compatibility with existing clients.
exports.getAllReviews = catchAsync(async (req, res, next) => {
  const baseFilter = {};

  const destinationId = req.params.destinationId || req.query.destination;

  if (destinationId) {
    if (!/^[a-f\d]{24}$/i.test(String(destinationId))) {
      return next(new AppError("Invalid destination ID", 400));
    }

    baseFilter.destination = destinationId;
  }

  const filter = { ...baseFilter };

  // Validate rating filter.
  if (req.query.rating !== undefined) {
    const rating = Number(req.query.rating);

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return next(new AppError("Rating filter must be between 1 and 5.", 400));
    }

    filter.rating = rating;
  }

  // Validate sorting.
  const allowedSortOptions = {
    newest: "-createdAt",
    oldest: "createdAt",
    highest: "-rating -createdAt",
    lowest: "rating -createdAt",
  };

  const sortOption = req.query.sort || "newest";

  if (!allowedSortOptions[sortOption]) {
    return next(
      new AppError(
        "Invalid sort option. Use newest, oldest, highest or lowest.",
        400,
      ),
    );
  }

  // Calculate statistics independently of the active rating filter.
  const statistics = await getReviewStatistics(baseFilter);

  // Determine whether this request should use pagination.
  const paginationRequested =
    req.query.page !== undefined ||
    req.query.limit !== undefined ||
    req.query.rating !== undefined ||
    req.query.sort !== undefined;

  let reviewsQuery = Review.find(filter).sort(allowedSortOptions[sortOption]);

  let pagination = null;
  let totalResults;

  if (paginationRequested) {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);

    const requestedLimit = Number.parseInt(req.query.limit, 10) || 10;

    const limit = Math.min(Math.max(requestedLimit, 1), 50);

    totalResults = await Review.countDocuments(filter);

    const totalPages = Math.ceil(totalResults / limit);

    reviewsQuery = reviewsQuery.skip((page - 1) * limit).limit(limit);

    pagination = {
      currentPage: page,
      totalPages,
      totalResults,
      limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  const reviews = await populateReview(reviewsQuery);

  if (totalResults === undefined) {
    totalResults = reviews.length;
  }

  res.status(200).json({
    status: "success",
    results: reviews.length,
    totalResults,
    data: {
      reviews,
      statistics,
      pagination,
    },
  });
});

// GET one review.
exports.getReview = catchAsync(async (req, res, next) => {
  const review = await populateReview(Review.findById(req.params.id));

  if (!review) {
    return next(new AppError("No review found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: { review },
  });
});

// CREATE a review with optional photos.
exports.createReview = catchAsync(async (req, res, next) => {
  const { review, rating, destination } = req.body;

  if (!destination) {
    return next(new AppError("Please provide a destination ID", 400));
  }

  if (!/^[a-f\d]{24}$/i.test(String(destination))) {
    return next(new AppError("Invalid destination ID", 400));
  }

  const destinationExists = await Destination.findById(destination);

  if (!destinationExists) {
    return next(new AppError("No destination found with that ID", 404));
  }

  let uploadedPhotos = [];
  let reviewCreated = false;

  try {
    uploadedPhotos = await uploadReviewPhotos(req.files || []);

    const newReview = await Review.create({
      review,
      rating,
      destination,
      user: req.user.id,
      photos: uploadedPhotos,
    });

    reviewCreated = true;

    // The review and its photo references are already saved.
    // Never delete those photos because a later operation fails.
    await updateDestinationRating(newReview.destination);

    const populatedReview = await populateReview(
      Review.findById(newReview._id),
    );

    res.status(201).json({
      status: "success",
      data: { review: populatedReview },
    });
  } catch (error) {
    // Only clean up uploaded photos when the review was not saved.
    if (!reviewCreated) {
      await deleteCloudinaryImages(uploadedPhotos);
    }

    if (error.code === 11000) {
      return next(
        new AppError(
          "You have already reviewed this destination. You can edit your existing review instead.",
          409,
        ),
      );
    }

    throw error;
  }
});

// UPDATE your own review, including its photos.
exports.updateReview = catchAsync(async (req, res, next) => {
  const review = await Review.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!review) {
    return next(
      new AppError("Review not found or you do not own this review", 404),
    );
  }

  const allowedFields = ["review", "rating", "removePhotoPublicIds"];

  const submittedFields = Object.keys(req.body);
  const hasNewPhotos = Boolean(req.files?.length);

  const invalidFields = submittedFields.filter(
    (field) => !allowedFields.includes(field),
  );

  if (invalidFields.length > 0) {
    return next(
      new AppError(
        `You cannot update these fields: ${invalidFields.join(", ")}`,
        400,
      ),
    );
  }

  if (submittedFields.length === 0 && !hasNewPhotos) {
    return next(
      new AppError("Please provide review details or photos to update", 400),
    );
  }

  let uploadedPhotos = [];
  let reviewSaved = false;

  try {
    const removalIds = getRemovalPublicIds(req.body.removePhotoPublicIds);

    const existingPhotos = review.photos || [];

    // Only allow removal of photos belonging to this review.
    for (const publicId of removalIds) {
      if (!existingPhotos.some((photo) => photo.publicId === publicId)) {
        throw new AppError(
          "A photo selected for removal does not belong to this review.",
          400,
        );
      }
    }

    uploadedPhotos = await uploadReviewPhotos(req.files || []);

    if (req.body.review !== undefined) {
      review.review = req.body.review;
    }

    if (req.body.rating !== undefined) {
      review.rating = req.body.rating;
    }

    const retainedPhotos = existingPhotos.filter(
      (photo) => !removalIds.has(photo.publicId),
    );

    review.photos = [...retainedPhotos, ...uploadedPhotos];

    await review.save();

    reviewSaved = true;

    // Recalculate the destination's ratings after the successful save.
    await updateDestinationRating(review.destination);

    // Remove old Cloudinary files only after the database update succeeds.
    const removedPhotos = existingPhotos.filter((photo) =>
      removalIds.has(photo.publicId),
    );

    await deleteCloudinaryImages(removedPhotos);

    const updatedReview = await populateReview(Review.findById(review._id));

    res.status(200).json({
      status: "success",
      data: { review: updatedReview },
    });
  } catch (error) {
    // If MongoDB has already saved the new photos, keep them.
    if (!reviewSaved) {
      await deleteCloudinaryImages(uploadedPhotos);
    }

    throw error;
  }
});

// DELETE your own review.
exports.deleteReview = catchAsync(async (req, res, next) => {
  const review = await Review.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!review) {
    return next(
      new AppError("Review not found or you do not own this review", 404),
    );
  }

  const destinationId = review.destination;
  const reviewPhotos = review.photos || [];

  await review.deleteOne();

  // Attempt both operations even if one of them fails.
  const results = await Promise.allSettled([
    updateDestinationRating(destinationId),
    deleteCloudinaryImages(reviewPhotos),
  ]);

  if (results[0].status === "rejected") {
    throw results[0].reason;
  }

  res.status(204).end();
});

// ADMIN: DELETE any review.
exports.deleteReviewAdmin = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new AppError("No review found with that ID", 404));
  }

  const destinationId = review.destination;
  const reviewPhotos = review.photos || [];

  await review.deleteOne();

  // Attempt both operations even if one of them fails.
  const results = await Promise.allSettled([
    updateDestinationRating(destinationId),
    deleteCloudinaryImages(reviewPhotos),
  ]);

  if (results[0].status === "rejected") {
    throw results[0].reason;
  }

  res.status(204).end();
});
