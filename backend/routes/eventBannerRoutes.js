const express = require("express");

const {
  getEventBanner,
  getEventBannerAdmin,
  updateEventBanner,
} = require("../controllers/eventBannerController");

const { protect, restrictTo } = require("../middleware/authMiddleware");

const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

// ============================================
// PUBLIC EVENT BANNER
// ============================================

// Get the 3 Events page banner slides.
router.get("/", getEventBanner);

// ============================================
// ADMIN EVENT BANNER MANAGEMENT
// ============================================

// Get the current banner configuration.
router.get("/admin", protect, restrictTo("admin"), getEventBannerAdmin);

// Replace or remove individual banner slides.
router.patch(
  "/admin",
  protect,
  restrictTo("admin"),
  upload.fields([
    { name: "slide1", maxCount: 1 },
    { name: "slide2", maxCount: 1 },
    { name: "slide3", maxCount: 1 },
  ]),
  updateEventBanner,
);

module.exports = router;
