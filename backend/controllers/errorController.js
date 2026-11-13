const AppError = require("../utils/appError");

// Handle invalid MongoDB IDs and values
const handleCastErrorDB = () =>
  new AppError("Invalid ID or value provided.", 400);

// Handle duplicate database fields
const handleDuplicateFieldsDB = (err) => {
  const fields = Object.keys(err.keyValue || {});

  if (fields.includes("email")) {
    return new AppError(
      "An account with this email already exists. Sign in instead or use a different email address.",
      409,
    );
  }

  if (fields.includes("user") && fields.includes("destination")) {
    return new AppError(
      "This destination is already saved or has already been reviewed by this user.",
      409,
    );
  }

  if (fields.includes("slug")) {
    return new AppError(
      "A destination with this name already exists. Please use a different name.",
      409,
    );
  }

  return new AppError(
    "This information already exists. Please check your details and try again.",
    409,
  );
};

// Handle Mongoose validation errors
const handleValidationErrorDB = (err) => {
  const messages = Object.values(err.errors || {})
    .map((item) => item.message)
    .join(". ");

  return new AppError(
    messages || "Please check the information you submitted.",
    400,
  );
};

// Handle malformed JSON
const handleInvalidJson = () => new AppError("Invalid JSON request body.", 400);

// Handle authentication errors
const handleJWTError = () =>
  new AppError("Invalid authentication token. Please log in again.", 401);

const handleJWTExpiredError = () =>
  new AppError(
    "Your authentication token has expired. Please log in again.",
    401,
  );

// Handle Multer upload errors
const handleMulterError = (err) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return new AppError("Image size must not exceed 5 MB.", 400);
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return new AppError("Unexpected image upload field.", 400);
  }

  if (err.code === "LIMIT_FILE_COUNT") {
    return new AppError("The upload contains too many files.", 400);
  }

  if (err.code === "LIMIT_PART_COUNT") {
    return new AppError("The upload contains too many parts.", 400);
  }

  return new AppError(
    "Image upload failed. Please check the image and try again.",
    400,
  );
};

// Development error response
const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    status: err.status || "error",
    message: err.message,
    stack: err.stack,
    error: err,
  });
};

// Production error response
const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    return res.status(err.statusCode || 500).json({
      status: err.status || "error",
      message: err.message,
    });
  }

  // Log unexpected errors on the server
  console.error("UNEXPECTED ERROR:", err);

  return res.status(500).json({
    status: "error",
    message: "Something went wrong!",
  });
};

// Global error-handling middleware
module.exports = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let error = err;

  if (err.name === "CastError") {
    error = handleCastErrorDB(err);
  } else if (err.code === 11000) {
    error = handleDuplicateFieldsDB(err);
  } else if (err.name === "ValidationError") {
    error = handleValidationErrorDB(err);
  } else if (
    err instanceof SyntaxError &&
    err.status === 400 &&
    "body" in err
  ) {
    error = handleInvalidJson();
  } else if (err.name === "JsonWebTokenError") {
    error = handleJWTError();
  } else if (err.name === "TokenExpiredError") {
    error = handleJWTExpiredError();
  } else if (err.name === "MulterError") {
    error = handleMulterError(err);
  }

  error.statusCode = error.statusCode || 500;
  error.status = error.status || "error";

  if (process.env.NODE_ENV === "development") {
    return sendErrorDev(error, res);
  }

  return sendErrorProd(error, res);
};
