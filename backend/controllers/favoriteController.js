
const mongoose = require("mongoose");
const Favorite = require("../models/favoriteModel");
const Destination = require("../models/destinationModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

// Validate a MongoDB document ID before querying.
const validateDestinationId = (destinationId, next) => {
  if (
    typeof destinationId !== "string" ||
    !mongoose.isValidObjectId(destinationId)
  ) {
    next(new AppError("Please provide a valid destination ID", 400));
    return false;
  }

  return true;
};

// GET your saved, published destinations.
exports.getMyFavorites = catchAsync(async (req, res, next) => {
  const favorites = await Favorite.find({ user: req.user.id })
    .populate({
      path: "destination",
      match: { isPublished: true },
    })
    .sort("-createdAt");

  // Exclude favorites whose destination is unpublished or no longer exists.
  const visibleFavorites = favorites.filter(
    (favorite) => favorite.destination,
  );

  res.status(200).json({
    status: "success",
    results: visibleFavorites.length,
    data: { favorites: visibleFavorites },
  });
});

// ADD a published destination to your favorites.
exports.addFavorite = catchAsync(async (req, res, next) => {
  const { destination } = req.body;

  if (!validateDestinationId(destination, next)) return;

  const destinationExists = await Destination.findOne({
    _id: destination,
    isPublished: true,
  }).select("_id");

  if (!destinationExists) {
    return next(
      new AppError("No published destination found with that ID", 404),
    );
  }

  const existingFavorite = await Favorite.findOne({
    user: req.user.id,
    destination,
  }).select("_id");

  if (existingFavorite) {
    return next(
      new AppError("This destination is already in your favorites", 409),
    );
  }

  try {
    const favorite = await Favorite.create({
      user: req.user.id,
      destination,
    });

    return res.status(201).json({
      status: "success",
      data: { favorite },
    });
  } catch (error) {
    // A concurrent request may have created the same favorite.
    if (error.code === 11000) {
      return next(
        new AppError("This destination is already in your favorites", 409),
      );
    }

    throw error;
  }
});

// REMOVE a destination from your favorites.
exports.removeFavorite = catchAsync(async (req, res, next) => {
  const { destinationId } = req.params;

  if (!validateDestinationId(destinationId, next)) return;

  const favorite = await Favorite.findOneAndDelete({
    user: req.user.id,
    destination: destinationId,
  });

  if (!favorite) {
    return next(
      new AppError("Favorite not found in your saved destinations", 404),
    );
  }

  return res.status(204).end();
});
