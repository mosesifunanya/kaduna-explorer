const mongoose = require("mongoose");

const Trip = require("../models/tripModel");
const Destination = require("../models/destinationModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

const TRIP_STATUSES = ["planned", "ongoing", "completed"];

const VISIT_STATUSES = ["planned", "visited"];

const MAX_DESTINATION_NOTES_LENGTH = 1000;

const POPULATE_DESTINATIONS = {
  path: "destinations.destination",
  select: "name slug coverImage category address",
};

// Validate MongoDB document IDs.

const isValidId = (id) =>
  typeof id === "string" && mongoose.isValidObjectId(id);

const validateDocumentId = (id, label, next) => {
  if (!isValidId(id)) {
    next(new AppError(`Please provide a valid ${label} ID`, 400));
    return false;
  }

  return true;
};

// Parse dates safely.

const parseDate = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    (typeof value !== "string" && !(value instanceof Date))
  ) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const isValidDateRange = (start, end) =>
  start instanceof Date &&
  end instanceof Date &&
  !Number.isNaN(start.getTime()) &&
  !Number.isNaN(end.getTime()) &&
  end >= start;

// Validate and normalize itinerary entries.

const normalizeItinerary = (items, startDate, endDate, next) => {
  if (!Array.isArray(items)) {
    next(new AppError("Destinations must be an array", 400));
    return null;
  }

  const normalized = [];
  const destinationIds = [];

  for (const [index, item] of items.entries()) {
    if (
      typeof item !== "string" &&
      (!item || typeof item !== "object" || Array.isArray(item))
    ) {
      next(
        new AppError(
          `Itinerary item ${index + 1} must be a destination ID or an object`,
          400,
        ),
      );

      return null;
    }

    const destinationId = typeof item === "string" ? item : item.destination;

    if (!isValidId(destinationId)) {
      next(
        new AppError(
          `Itinerary item ${index + 1} must contain a valid destination ID`,
          400,
        ),
      );

      return null;
    }

    if (destinationIds.includes(destinationId)) {
      next(
        new AppError("A destination cannot appear twice in the same trip", 400),
      );

      return null;
    }

    destinationIds.push(destinationId);

    const entry = typeof item === "string" ? {} : item;

    // Validate visit date.

    let visitDate;

    if (entry.visitDate !== undefined && entry.visitDate !== null) {
      visitDate = parseDate(entry.visitDate);

      if (!visitDate) {
        next(
          new AppError(
            `Itinerary item ${index + 1} has an invalid visit date`,
            400,
          ),
        );

        return null;
      }

      if (visitDate < startDate || visitDate > endDate) {
        next(
          new AppError(
            `Visit date for itinerary item ${index + 1} must fall within the trip dates`,
            400,
          ),
        );

        return null;
      }
    }

    // Validate itinerary order.

    const order = entry.order ?? index;

    if (
      typeof order !== "number" ||
      !Number.isFinite(order) ||
      !Number.isInteger(order) ||
      order < 0
    ) {
      next(
        new AppError(
          `Itinerary item ${index + 1} must have a nonnegative whole-number order`,
          400,
        ),
      );

      return null;
    }

    // Validate visit status.

    const visitStatus = entry.visitStatus ?? "planned";

    if (!VISIT_STATUSES.includes(visitStatus)) {
      next(
        new AppError(
          `Itinerary item ${index + 1} has an invalid visit status`,
          400,
        ),
      );

      return null;
    }

    // Validate personal notes.

    const notes = entry.notes ?? "";

    if (typeof notes !== "string") {
      next(
        new AppError(`Notes for itinerary item ${index + 1} must be text`, 400),
      );

      return null;
    }

    if (notes.length > MAX_DESTINATION_NOTES_LENGTH) {
      next(
        new AppError(
          `Notes for itinerary item ${index + 1} cannot exceed 1000 characters`,
          400,
        ),
      );

      return null;
    }

    normalized.push({
      destination: destinationId,
      ...(visitDate ? { visitDate } : {}),
      order,
      visitStatus,
      notes: notes.trim(),
    });
  }

  return {
    normalized,
    destinationIds,
  };
};

// Ensure all destinations exist and are published.

const validatePublishedDestinations = async (destinationIds, next) => {
  if (destinationIds.length === 0) return true;

  const publishedCount = await Destination.countDocuments({
    _id: { $in: destinationIds },
    isPublished: true,
  });

  if (publishedCount !== destinationIds.length) {
    next(
      new AppError(
        "One or more destinations do not exist or are not published",
        404,
      ),
    );

    return false;
  }

  return true;
};

// GET all trips belonging to the logged-in user.

exports.getMyTrips = catchAsync(async (req, res) => {
  const trips = await Trip.find({
    user: req.user.id,
  })
    .populate(POPULATE_DESTINATIONS)
    .sort("-createdAt");

  res.status(200).json({
    status: "success",
    results: trips.length,
    data: {
      trips,
    },
  });
});

// CREATE a trip.

exports.createTrip = catchAsync(async (req, res, next) => {
  const { name, description, startDate, endDate, destinations, status } =
    req.body;

  if (typeof name !== "string" || !name.trim() || !startDate || !endDate) {
    return next(
      new AppError("Please provide a trip name, start date, and end date", 400),
    );
  }

  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (!isValidDateRange(start, end)) {
    return next(
      new AppError("Please provide valid trip dates in the correct order", 400),
    );
  }

  if (status !== undefined && !TRIP_STATUSES.includes(status)) {
    return next(new AppError("Invalid trip status", 400));
  }

  const itinerary = normalizeItinerary(destinations ?? [], start, end, next);

  if (!itinerary) return;

  const destinationsValid = await validatePublishedDestinations(
    itinerary.destinationIds,
    next,
  );

  if (!destinationsValid) return;

  const trip = await Trip.create({
    name: name.trim(),
    description,
    startDate: start,
    endDate: end,
    destinations: itinerary.normalized,
    status: status ?? "planned",
    user: req.user.id,
  });

  await trip.populate(POPULATE_DESTINATIONS);

  res.status(201).json({
    status: "success",
    data: {
      trip,
    },
  });
});

// GET one trip belonging to the logged-in user.

exports.getTrip = catchAsync(async (req, res, next) => {
  if (!validateDocumentId(req.params.id, "trip", next)) return;

  const trip = await Trip.findOne({
    _id: req.params.id,
    user: req.user.id,
  }).populate(POPULATE_DESTINATIONS);

  if (!trip) {
    return next(new AppError("Trip not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      trip,
    },
  });
});

// UPDATE your own trip.

exports.updateTrip = catchAsync(async (req, res, next) => {
  if (!validateDocumentId(req.params.id, "trip", next)) return;

  const allowedFields = [
    "name",
    "description",
    "startDate",
    "endDate",
    "destinations",
    "status",
  ];

  const updates = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return next(new AppError("Please provide fields to update", 400));
  }

  const trip = await Trip.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!trip) {
    return next(new AppError("Trip not found", 404));
  }

  if (
    updates.name !== undefined &&
    (typeof updates.name !== "string" || !updates.name.trim())
  ) {
    return next(new AppError("Trip name cannot be empty", 400));
  }

  if (updates.name !== undefined) {
    updates.name = updates.name.trim();
  }

  if (
    updates.description !== undefined &&
    typeof updates.description !== "string"
  ) {
    return next(new AppError("Trip description must be text", 400));
  }

  if (updates.description !== undefined && updates.description.length > 2000) {
    return next(
      new AppError("Trip description cannot exceed 2000 characters", 400),
    );
  }

  if (updates.status !== undefined && !TRIP_STATUSES.includes(updates.status)) {
    return next(new AppError("Invalid trip status", 400));
  }

  const finalStart =
    updates.startDate !== undefined
      ? parseDate(updates.startDate)
      : trip.startDate;

  const finalEnd =
    updates.endDate !== undefined ? parseDate(updates.endDate) : trip.endDate;

  if (!isValidDateRange(finalStart, finalEnd)) {
    return next(
      new AppError("Please provide valid trip dates in the correct order", 400),
    );
  }

  updates.startDate = finalStart;
  updates.endDate = finalEnd;

  if (updates.destinations !== undefined) {
    const itinerary = normalizeItinerary(
      updates.destinations,
      finalStart,
      finalEnd,
      next,
    );

    if (!itinerary) return;

    const destinationsValid = await validatePublishedDestinations(
      itinerary.destinationIds,
      next,
    );

    if (!destinationsValid) return;

    updates.destinations = itinerary.normalized;
  } else {
    // Existing scheduled visits must remain within the trip dates.

    for (const item of trip.destinations) {
      if (
        item.visitDate &&
        (item.visitDate < finalStart || item.visitDate > finalEnd)
      ) {
        return next(
          new AppError(
            "Updated trip dates must include every scheduled visit date",
            400,
          ),
        );
      }
    }
  }

  Object.assign(trip, updates);

  await trip.save();
  await trip.populate(POPULATE_DESTINATIONS);

  res.status(200).json({
    status: "success",
    data: {
      trip,
    },
  });
});

// DELETE your own trip.

exports.deleteTrip = catchAsync(async (req, res, next) => {
  if (!validateDocumentId(req.params.id, "trip", next)) return;

  const trip = await Trip.findOneAndDelete({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!trip) {
    return next(new AppError("Trip not found", 404));
  }

  res.status(204).end();
});
