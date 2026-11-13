const express = require("express");

const {
  getPublicHomepage,
  getAdminHomepage,
  updateHomepage,
} = require("../controllers/homepageController");

const { protect, restrictTo } = require("../middleware/authMiddleware");
const { upload } = require("../middleware/uploadMiddleware");

const router = express.Router();

// Public homepage content
router.get("/", getPublicHomepage);

// Admin homepage content
router.get("/admin", protect, restrictTo("admin"), getAdminHomepage);

// Update homepage content and upload images
router.patch(
  "/admin",
  protect,
  restrictTo("admin"),
  upload.any(),
  updateHomepage,
);

module.exports = router;
