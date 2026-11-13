const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  signup,
  login,
  googleLogin,
  logout,
  updatePassword,
  forgotPassword,
  resetPassword,
  getMe,
  updateMe,
  uploadMyPhoto,
  deactivateMe,
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
} = require("../controllers/authController");

const { protect, restrictTo } = require("../middleware/authMiddleware");
const uploadMiddleware = require("../middleware/uploadMiddleware");

const router = express.Router();

// Limit failed login attempts to 15 per 15 minutes per IP.
// Successful login responses do not count towards the limit.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    status: "fail",
    message: "Too many failed login attempts. Please try again in 15 minutes.",
  },
});

// Limit repeated password reset requests.
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    status: "fail",
    message:
      "Too many password reset requests. Please try again in 15 minutes.",
  },
});

// Public authentication routes
router.post("/signup", signup);
router.post("/login", loginLimiter, login);
router.post("/google", loginLimiter, googleLogin);
router.post("/forgotPassword", passwordResetLimiter, forgotPassword);
router.patch("/resetPassword/:token", passwordResetLimiter, resetPassword);

// Protected authentication routes
router.post("/logout", protect, logout);
router.patch("/updatePassword", protect, updatePassword);

// Current user's account
router.get("/me", protect, getMe);
router.patch("/updateMe", protect, updateMe);

// Upload the authenticated user's profile photo.
// This must appear before the generic "/:id" route.
router.patch(
  "/updateMyPhoto",
  protect,
  uploadMiddleware.single("photo"),
  uploadMyPhoto,
);

router.delete("/deactivateMe", protect, deactivateMe);

// Admin-only: get all users
router.route("/").get(protect, restrictTo("admin"), getAllUsers);

// Admin-only: manage one user by MongoDB ID
router
  .route("/:id")
  .get(protect, restrictTo("admin"), getUser)
  .patch(protect, restrictTo("admin"), updateUser)
  .delete(protect, restrictTo("admin"), deleteUser);

module.exports = router;
