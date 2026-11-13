const express = require("express");

const destinationController = require("../controllers/destinationController");
const placesController = require("../controllers/placesController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

// ============================================
// ROUTE HANDLER VALIDATION
// ============================================

function requireHandler(handler, name) {
  if (typeof handler !== "function") {
    throw new TypeError(
      `[destinationRoutes] ${name} must be a function. Check its export and import.`,
    );
  }

  return handler;
}

// ============================================
// DESTINATION CONTROLLERS
// ============================================

const {
  getAllDestinations,
  getAllDestinationsAdmin,
  getFeaturedDestinations,
  getDestination,
  createDestination,
  reorderDestinations,
  updateDestination,
  deleteDestination,
} = destinationController;

// ============================================
// AUTHENTICATION AND AUTHORIZATION
// ============================================

const protect = requireHandler(
  authMiddleware.protect,
  "authMiddleware.protect",
);

const restrictTo = requireHandler(
  authMiddleware.restrictTo,
  "authMiddleware.restrictTo",
);

const adminOnly = requireHandler(
  restrictTo("admin"),
  'authMiddleware.restrictTo("admin")',
);

// ============================================
// VALIDATE DESTINATION HANDLERS
// ============================================

const getAll = requireHandler(
  getAllDestinations,
  "destinationController.getAllDestinations",
);

const getAllAdmin = requireHandler(
  getAllDestinationsAdmin,
  "destinationController.getAllDestinationsAdmin",
);

const getFeatured = requireHandler(
  getFeaturedDestinations,
  "destinationController.getFeaturedDestinations",
);

const getOne = requireHandler(
  getDestination,
  "destinationController.getDestination",
);

const create = requireHandler(
  createDestination,
  "destinationController.createDestination",
);

const reorder = requireHandler(
  reorderDestinations,
  "destinationController.reorderDestinations",
);

const update = requireHandler(
  updateDestination,
  "destinationController.updateDestination",
);

const remove = requireHandler(
  deleteDestination,
  "destinationController.deleteDestination",
);

// ============================================
// EXTERNAL PLACES AND GPS CONTROLLERS
// ============================================

const searchExternalPlaces = requireHandler(
  placesController.searchPlaces,
  "placesController.searchPlaces",
);

const searchPlaceImage = requireHandler(
  placesController.searchPlaceImage,
  "placesController.searchPlaceImage",
);

const validateVisitorLocation = requireHandler(
  placesController.validateLocation,
  "placesController.validateLocation",
);

// ============================================
// IMAGE UPLOAD CONFIGURATION
// ============================================

// Accept image field names without imposing a fixed gallery count.
// The destination controller handles cover and gallery images.
if (!upload || typeof upload.any !== "function") {
  throw new TypeError(
    "[destinationRoutes] uploadMiddleware must export a configured Multer instance.",
  );
}

const destinationImageUpload = upload.any();

// ============================================
// PLACE SEARCH AND GPS VALIDATION ROUTES
// ============================================

// Register specific routes before /:id.

// GET /api/v1/destinations/validate-location?lat=9.05&lon=7.48
// Checks the visitor's coordinates against the Kaduna State boundary.
// Does not call external places providers.
router.get("/validate-location", validateVisitorLocation);

// GET /api/v1/destinations/search/image?q=Kaduna+Museum
// Loads an image independently after place results are displayed.
router.get("/search/image", searchPlaceImage);

// GET /api/v1/destinations/search/places?q=hospital&provider=google
// GET /api/v1/destinations/search/places?q=hospital&provider=osm
router.get("/search/places", searchExternalPlaces);

// ============================================
// DESTINATION READ ROUTES
// ============================================

router.get("/featured", getFeatured);

router.get("/", getAll);

router.get("/admin", protect, adminOnly, getAllAdmin);

// ============================================
// GLOBAL DESTINATION REORDER
// PATCH /api/v1/destinations/reorder
// ============================================

// Send every destination ID in the exact order wanted.
// Example body:
// {
//   "destinationIds": [
//     "64a000000000000000000001",
//     "64a000000000000000000002"
//   ]
// }
//
// Only authenticated administrators can change the order.
router.patch("/reorder", protect, adminOnly, reorder);

// ============================================
// DESTINATION CREATE, UPDATE AND DELETE
// ============================================

router.post("/", protect, adminOnly, destinationImageUpload, create);

router.patch("/:id", protect, adminOnly, destinationImageUpload, update);

router.delete("/:id", protect, adminOnly, remove);

// Keep this parameter route after specific routes.
router.get("/:id", getOne);

module.exports = router;
