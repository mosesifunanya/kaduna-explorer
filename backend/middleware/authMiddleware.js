const jwt = require("jsonwebtoken");
const { promisify } = require("util");

const User = require("../models/userModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.protect = catchAsync(async (req, res, next) => {
  let token;

  // Read the token from the Authorization header or cookie.
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.jwt) {
    token = req.cookies.jwt;
  }

  if (!token || token === "loggedout") {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401),
    );
  }

  // Verify the JWT.
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // Find the account associated with this token.
  const currentUser = await User.findById(decoded.id).select("+isActive");

  if (!currentUser) {
    return next(
      new AppError("The user belonging to this token no longer exists.", 401),
    );
  }

  // Reject sessions invalidated by logout or other security actions.
  if (decoded.tokenVersion !== currentUser.tokenVersion) {
    return next(
      new AppError(
        "Your session is no longer valid. Please log in again.",
        401,
      ),
    );
  }

  if (!currentUser.isActive) {
    return next(new AppError("This account is no longer active.", 403));
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("Password changed recently. Please log in again.", 401),
    );
  }

  req.user = currentUser;

  next();
});

// Restrict access to specified roles.
exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action.", 403),
      );
    }

    next();
  };
