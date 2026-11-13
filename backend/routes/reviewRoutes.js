const express = require("express");

const {
  getAllReviews,
  getReview,
  createReview,
  updateReview,
  deleteReview,
  deleteReviewAdmin,
} = require("../controllers/reviewController");

const { protect, restrictTo } = require("../middleware/authMiddleware");

const upload = require("../middleware/uploadMiddleware");

const router = express.Router({ mergeParams: true });

// Get all reviews or create a review.
router
  .route("/")
  .get(getAllReviews)
  .post(protect, upload.array("photos"), createReview);

// Admin-only review deletion.
router
  .route("/admin/:id")
  .delete(protect, restrictTo("admin"), deleteReviewAdmin);

// Get, update, or delete an individual review.
router
  .route("/:id")
  .get(getReview)
  .patch(protect, upload.array("photos"), updateReview)
  .delete(protect, deleteReview);

module.exports = router;
