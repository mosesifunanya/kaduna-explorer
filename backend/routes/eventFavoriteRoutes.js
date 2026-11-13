const express = require("express");

const {
  getMyEventFavorites,
  addEventFavorite,
  removeEventFavorite,
} = require("../controllers/eventFavoriteController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All event favorite routes require authentication.
router.use(protect);

// Get the logged-in user's saved events.
router.get("/", getMyEventFavorites);

// Add an event to favorites.
router.post("/", addEventFavorite);

// Remove an event from favorites.
router.delete("/:eventId", removeEventFavorite);

module.exports = router;
