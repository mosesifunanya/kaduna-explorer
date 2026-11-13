const express = require("express");

const {
  getAllEvents,
  getEvent,
  getAllEventsAdmin,
  getEventAdmin,
  createEvent,
  updateEvent,
  deleteEvent,
} = require("../controllers/eventController");

const { protect, restrictTo } = require("../middleware/authMiddleware");

const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

// ============================================
// ADMIN EVENT MANAGEMENT
// Keep these routes before /:id.
// ============================================

// Get all events, including unpublished and expired events.
router.get("/admin", protect, restrictTo("admin"), getAllEventsAdmin);

// Get one event for administration.
router.get("/admin/:id", protect, restrictTo("admin"), getEventAdmin);

// Create an event.
router.post("/", protect, restrictTo("admin"), upload.any(), createEvent);

// Update an event.
router.patch("/:id", protect, restrictTo("admin"), upload.any(), updateEvent);

// Delete an event.
router.delete("/:id", protect, restrictTo("admin"), deleteEvent);

// ============================================
// PUBLIC EVENT ROUTES
// ============================================

// Get published events.
router.get("/", getAllEvents);

// Get one published event by its ID or slug.
router.get("/:id", getEvent);

module.exports = router;
