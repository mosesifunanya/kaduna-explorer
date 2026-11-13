const mongoose = require("mongoose");

const EventReview = require("../models/eventReviewModel");
const Event = require("../models/eventModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

// ============================================
// VALIDATION HELPERS
// ============================================

const isValidId = (id) =>
  typeof id === "string" && mongoose.isValidObjectId(id);

const validateEventId = (eventId, next) => {
  if (!isValidId(eventId)) {
    next(new AppError("Please provide a valid event ID", 400));
    return false;
  }

  return true;
};

const validateReviewId = (reviewId, next) => {
  if (!isValidId(reviewId)) {
    next(new AppError("Please provide a valid review ID", 400));
    return false;
  }

  return true;
};

// ============================================
// EVENT RATING RECALCULATION
// ============================================

// Recalculate an event's rating using publicly visible reviews.
const updateEventRating = async (eventId) => {
  const stats = await EventReview.aggregate([
    {
      $match: {
        event: new mongoose.Types.ObjectId(eventId),
        status: { $in: ["approved", "pending"] },
      },
    },
    {
      $group: {
        _id: "$event",
        averageRating: { $avg: "$rating" },
        ratingsCount: { $sum: 1 },
      },
    },
  ]);

  await Event.findByIdAndUpdate(eventId, {
    averageRating:
      stats.length > 0 ? Math.round(stats[0].averageRating * 10) / 10 : 0,
    ratingsCount: stats.length > 0 ? stats[0].ratingsCount : 0,
  });
};

// ============================================
// GET ALL PUBLIC EVENT REVIEWS
// ============================================

// Supports both nested event routes and eventId query parameters.
exports.getAllEventReviews = catchAsync(async (req, res, next) => {
  const eventId = req.params.eventId || req.query.eventId;

  if (!eventId) {
    return next(new AppError("Please provide an event ID", 400));
  }

  if (!validateEventId(eventId, next)) return;

  const eventExists = await Event.findOne({
    _id: eventId,
    isPublished: true,
  }).select("_id");

  if (!eventExists) {
    return next(new AppError("No published event found with that ID", 404));
  }

  const reviews = await EventReview.find({
    event: eventId,
    status: { $in: ["approved", "pending"] },
  })
    .populate("user", "name")
    .populate("event", "title slug")
    .sort("-createdAt");

  return res.status(200).json({
    status: "success",
    results: reviews.length,
    data: { reviews },
  });
});

// ============================================
// GET ONE PUBLIC EVENT REVIEW
// ============================================

exports.getEventReview = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!validateReviewId(id, next)) return;

  const review = await EventReview.findOne({
    _id: id,
    status: { $in: ["approved", "pending"] },
  })
    .populate("user", "name")
    .populate("event", "title slug");

  if (!review) {
    return next(new AppError("No published review found with that ID", 404));
  }

  return res.status(200).json({
    status: "success",
    data: { review },
  });
});

// ============================================
// CREATE EVENT REVIEW
// ============================================

exports.createEventReview = catchAsync(async (req, res, next) => {
  const { review, rating, event } = req.body;

  if (!event) {
    return next(new AppError("Please provide an event ID", 400));
  }

  if (!validateEventId(event, next)) return;

  const eventExists = await Event.findOne({
    _id: event,
    isPublished: true,
  }).select("_id");

  if (!eventExists) {
    return next(new AppError("No published event found with that ID", 404));
  }

  try {
    const newReview = await EventReview.create({
      review,
      rating,
      event,
      user: req.user.id,
      status: "approved",
    });

    await updateEventRating(event);

    const populatedReview = await EventReview.findById(newReview._id)
      .populate("user", "name")
      .populate("event", "title slug");

    return res.status(201).json({
      status: "success",
      message:
        "Your review has been published successfully. Thank you for sharing your experience.",
      data: { review: populatedReview },
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError("You have already reviewed this event", 409));
    }

    throw error;
  }
});

// ============================================
// UPDATE OWN EVENT REVIEW
// ============================================

// Users can edit their own published reviews without admin approval.
exports.updateEventReview = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!validateReviewId(id, next)) return;

  const eventReview = await EventReview.findOne({
    _id: id,
    user: req.user.id,
  });

  if (!eventReview) {
    return next(
      new AppError("Review not found or you do not own this review", 404),
    );
  }

  if (
    req.body.event !== undefined ||
    req.body.user !== undefined ||
    req.body.status !== undefined ||
    req.body.moderatedBy !== undefined ||
    req.body.moderatedAt !== undefined
  ) {
    return next(
      new AppError(
        "You cannot change the review owner, event, or moderation status",
        400,
      ),
    );
  }

  const eventId = eventReview.event;

  if (req.body.review !== undefined) {
    eventReview.review = req.body.review;
  }

  if (req.body.rating !== undefined) {
    eventReview.rating = req.body.rating;
  }

  eventReview.status = "approved";
  eventReview.moderatedBy = null;
  eventReview.moderatedAt = null;
  eventReview.moderationNote = "";

  await eventReview.save();
  await updateEventRating(eventId);

  return res.status(200).json({
    status: "success",
    message: "Your review has been updated and published.",
    data: { review: eventReview },
  });
});

// ============================================
// DELETE OWN EVENT REVIEW
// ============================================

exports.deleteEventReview = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!validateReviewId(id, next)) return;

  const eventReview = await EventReview.findOne({
    _id: id,
    user: req.user.id,
  });

  if (!eventReview) {
    return next(
      new AppError("Review not found or you do not own this review", 404),
    );
  }

  const eventId = eventReview.event;

  await eventReview.deleteOne();
  await updateEventRating(eventId);

  return res.status(204).end();
});

// ============================================
// ADMIN: GET ALL EVENT REVIEWS
// ============================================

exports.getAllEventReviewsAdmin = catchAsync(async (req, res, next) => {
  const filter = {};

  if (req.query.status) {
    const allowedStatuses = ["pending", "approved", "rejected"];

    if (!allowedStatuses.includes(req.query.status)) {
      return next(
        new AppError(
          "Invalid review status. Use pending, approved, or rejected.",
          400,
        ),
      );
    }

    filter.status = req.query.status;
  }

  if (req.query.eventId) {
    if (!validateEventId(req.query.eventId, next)) return;
    filter.event = req.query.eventId;
  }

  const reviews = await EventReview.find(filter)
    .populate("user", "name email")
    .populate("event", "title slug")
    .populate("moderatedBy", "name")
    .sort("-createdAt");

  return res.status(200).json({
    status: "success",
    results: reviews.length,
    data: { reviews },
  });
});

// ============================================
// ADMIN: APPROVE OR REJECT EVENT REVIEW
// ============================================

exports.moderateEventReview = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { status, moderationNote } = req.body;

  if (!validateReviewId(id, next)) return;

  if (!["approved", "rejected"].includes(status)) {
    return next(
      new AppError("Review status must be either approved or rejected", 400),
    );
  }

  if (moderationNote !== undefined && typeof moderationNote !== "string") {
    return next(new AppError("Moderation note must be a string", 400));
  }

  const eventReview = await EventReview.findById(id);

  if (!eventReview) {
    return next(new AppError("No event review found with that ID", 404));
  }

  eventReview.status = status;
  eventReview.moderatedBy = req.user.id;
  eventReview.moderatedAt = new Date();
  eventReview.moderationNote = moderationNote || "";

  await eventReview.save();
  await updateEventRating(eventReview.event);

  const populatedReview = await EventReview.findById(eventReview._id)
    .populate("user", "name email")
    .populate("event", "title slug")
    .populate("moderatedBy", "name");

  return res.status(200).json({
    status: "success",
    message:
      status === "approved"
        ? "Event review approved successfully."
        : "Event review rejected successfully.",
    data: { review: populatedReview },
  });
});

// ============================================
// ADMIN: DELETE ANY EVENT REVIEW
// ============================================

exports.deleteEventReviewAdmin = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!validateReviewId(id, next)) return;

  const eventReview = await EventReview.findById(id);

  if (!eventReview) {
    return next(new AppError("No event review found with that ID", 404));
  }

  const eventId = eventReview.event;

  await eventReview.deleteOne();
  await updateEventRating(eventId);

  return res.status(204).end();
});
