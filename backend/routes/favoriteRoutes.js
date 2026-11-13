const express = require("express");

const {
  getMyFavorites,
  addFavorite,
  removeFavorite,
} = require("../controllers/favoriteController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All favorites routes require authentication.
router.use(protect);

// Get the logged-in user's favorites.
router.get("/", getMyFavorites);

// Add a destination to favorites.
router.post("/", addFavorite);

// Remove a destination from favorites.
router.delete("/:destinationId", removeFavorite);

module.exports = router;
