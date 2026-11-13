const express = require("express");

const {
  getAllEventReviews,
  getEventReview,
  createEventReview,
  updateEventReview,
  deleteEventReview,
  getAllEventReviewsAdmin,
  moderateEventReview,
  deleteEventReviewAdmin,
} = require("../controllers/eventReviewController");

const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();

// ============================================
// ADMIN REVIEW MANAGEMENT
// Keep these routes before /:id.
// ============================================

// Get all reviews, including pending and rejected reviews.
router.get("/admin", protect, restrictTo("admin"), getAllEventReviewsAdmin);

// Approve or reject an event review.
router.patch(
  "/admin/:id/moderate",
  protect,
  restrictTo("admin"),
  moderateEventReview,
);

// Delete any event review.
router.delete(
  "/admin/:id",
  protect,
  restrictTo("admin"),
  deleteEventReviewAdmin,
);

// ============================================
// PUBLIC AND USER REVIEW ROUTES
// ============================================

// Get approved reviews or submit a review.
router.route("/").get(getAllEventReviews).post(protect, createEventReview);

// Get, update, or delete an individual review.
router
  .route("/:id")
  .get(getEventReview)
  .patch(protect, updateEventReview)
  .delete(protect, deleteEventReview);

module.exports = router;
