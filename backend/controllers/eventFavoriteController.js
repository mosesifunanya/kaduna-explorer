const mongoose = require("mongoose");

const EventFavorite = require("../models/eventFavoriteModel");
const Event = require("../models/eventModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

const ENDED_EVENT_RETENTION_HOURS = 24;

// Validate a MongoDB event ID before querying.
const validateEventId = (eventId, next) => {
  if (typeof eventId !== "string" || !mongoose.isValidObjectId(eventId)) {
    next(new AppError("Please provide a valid event ID", 400));
    return false;
  }

  return true;
};

// GET your saved, published events.
exports.getMyEventFavorites = catchAsync(async (req, res, next) => {
  const retentionCutoff = new Date(
    Date.now() - ENDED_EVENT_RETENTION_HOURS * 60 * 60 * 1000,
  );

  const favorites = await EventFavorite.find({
    user: req.user.id,
  })
    .populate({
      path: "event",
      match: {
        isPublished: true,
        endDate: { $gte: retentionCutoff },
      },
    })
    .sort("-createdAt");

  // Exclude favorites whose events are unpublished, expired,
  // or no longer exist.
  const visibleFavorites = favorites.filter((favorite) => favorite.event);

  return res.status(200).json({
    status: "success",
    results: visibleFavorites.length,
    data: {
      favorites: visibleFavorites,
    },
  });
});

// ADD a published event to your favorites.
exports.addEventFavorite = catchAsync(async (req, res, next) => {
  const { event } = req.body;

  if (!validateEventId(event, next)) return;

  const retentionCutoff = new Date(
    Date.now() - ENDED_EVENT_RETENTION_HOURS * 60 * 60 * 1000,
  );

  const eventExists = await Event.findOne({
    _id: event,
    isPublished: true,
    endDate: { $gte: retentionCutoff },
  }).select("_id");

  if (!eventExists) {
    return next(
      new AppError("No available published event found with that ID", 404),
    );
  }

  const existingFavorite = await EventFavorite.findOne({
    user: req.user.id,
    event,
  }).select("_id");

  if (existingFavorite) {
    return next(new AppError("This event is already in your favorites", 409));
  }

  try {
    const favorite = await EventFavorite.create({
      user: req.user.id,
      event,
    });

    return res.status(201).json({
      status: "success",
      data: {
        favorite,
      },
    });
  } catch (error) {
    // A concurrent request may have created the same favorite.
    if (error.code === 11000) {
      return next(new AppError("This event is already in your favorites", 409));
    }

    throw error;
  }
});

// REMOVE an event from your favorites.
exports.removeEventFavorite = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;

  if (!validateEventId(eventId, next)) return;

  const favorite = await EventFavorite.findOneAndDelete({
    user: req.user.id,
    event: eventId,
  });

  if (!favorite) {
    return next(new AppError("Favorite not found in your saved events", 404));
  }

  return res.status(204).end();
});
