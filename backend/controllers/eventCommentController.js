const mongoose = require("mongoose");

const EventComment = require("../models/eventCommentModel");
const Event = require("../models/eventModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

const COMMENT_LIMIT = 2000;

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

const validateCommentId = (commentId, next) => {
  if (!isValidId(commentId)) {
    next(new AppError("Please provide a valid comment ID", 400));
    return false;
  }

  return true;
};

const validateCommentText = (comment, next) => {
  if (typeof comment !== "string" || !comment.trim()) {
    next(new AppError("Please write a comment before submitting", 400));
    return false;
  }

  if (comment.trim().length > COMMENT_LIMIT) {
    next(
      new AppError(`A comment cannot exceed ${COMMENT_LIMIT} characters`, 400),
    );
    return false;
  }

  return true;
};

// ============================================
// GET ALL PUBLIC COMMENTS FOR AN EVENT
// ============================================

exports.getAllEventComments = catchAsync(async (req, res, next) => {
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

  const comments = await EventComment.find({
    event: eventId,
  })
    .populate("user", "name")
    .sort("-createdAt");

  return res.status(200).json({
    status: "success",
    results: comments.length,
    data: {
      comments,
    },
  });
});

// ============================================
// CREATE EVENT COMMENT
// ============================================

exports.createEventComment = catchAsync(async (req, res, next) => {
  const { event, comment } = req.body;

  if (!validateEventId(event, next)) return;
  if (!validateCommentText(comment, next)) return;

  const eventExists = await Event.findOne({
    _id: event,
    isPublished: true,
  }).select("_id");

  if (!eventExists) {
    return next(new AppError("No published event found with that ID", 404));
  }

  const newComment = await EventComment.create({
    event,
    user: req.user.id,
    comment: comment.trim(),
  });

  const populatedComment = await EventComment.findById(newComment._id).populate(
    "user",
    "name",
  );

  return res.status(201).json({
    status: "success",
    message: "Your comment has been published successfully.",
    data: {
      comment: populatedComment,
    },
  });
});

// ============================================
// UPDATE YOUR OWN EVENT COMMENT
// ============================================

exports.updateEventComment = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!validateCommentId(id, next)) return;

  const eventComment = await EventComment.findOne({
    _id: id,
    user: req.user.id,
  });

  if (!eventComment) {
    return next(
      new AppError("Comment not found or you do not own this comment", 404),
    );
  }

  if (req.body.event !== undefined || req.body.user !== undefined) {
    return next(
      new AppError("You cannot change the comment owner or event", 400),
    );
  }

  if (!validateCommentText(req.body.comment, next)) return;

  eventComment.comment = req.body.comment.trim();

  await eventComment.save();
  await eventComment.populate("user", "name");

  return res.status(200).json({
    status: "success",
    message: "Your comment has been updated successfully.",
    data: {
      comment: eventComment,
    },
  });
});

// ============================================
// DELETE YOUR OWN EVENT COMMENT
// ============================================

exports.deleteEventComment = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!validateCommentId(id, next)) return;

  const eventComment = await EventComment.findOne({
    _id: id,
    user: req.user.id,
  });

  if (!eventComment) {
    return next(
      new AppError("Comment not found or you do not own this comment", 404),
    );
  }

  await eventComment.deleteOne();

  return res.status(204).end();
});
