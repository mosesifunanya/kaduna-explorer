const multer = require("multer");
const AppError = require("../utils/appError");

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const storage = multer.memoryStorage();

const fileFilter = (req, file, callback) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return callback(
      new AppError(
        "Unsupported image format. Please upload JPG, PNG, or WebP images.",
        400,
      ),
      false,
    );
  }

  callback(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

// Supports both existing import styles:
// const uploadMiddleware = require("../middleware/uploadMiddleware");
// const { upload } = require("../middleware/uploadMiddleware");

module.exports = upload;
module.exports.upload = upload;
