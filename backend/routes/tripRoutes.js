const express = require("express");

const {
  getMyTrips,
  createTrip,
  getTrip,
  updateTrip,
  deleteTrip,
} = require("../controllers/tripController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All trip routes require authentication.
router.use(protect);

// Get all trips and create a new trip.
router.route("/").get(getMyTrips).post(createTrip);

// Get, update, and delete an individual trip.
router.route("/:id").get(getTrip).patch(updateTrip).delete(deleteTrip);

module.exports = router;
