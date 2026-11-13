const express = require("express");

const {
  getAllEventComments,
  createEventComment,
  updateEventComment,
  deleteEventComment,
} = require("../controllers/eventCommentController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Anyone can read comments.
router.get("/", getAllEventComments);

// Only authenticated users can create comments.
router.post("/", protect, createEventComment);

// Only authenticated comment owners can edit or delete.
// Ownership is enforced inside the controller.
router.patch("/:id", protect, updateEventComment);
router.delete("/:id", protect, deleteEventComment);

module.exports = router;
