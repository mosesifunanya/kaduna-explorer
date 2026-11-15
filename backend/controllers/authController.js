const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/userModel");
const signToken = require("../utils/signToken");
const sendEmail = require("../utils/sendEmail");
const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

const {
  welcomeEmail,
  passwordResetEmail,
  passwordChangedEmail,
} = require("../utils/emailTemplates");

const catchAsync = require("../utils/catchAsync");
const googleClient = new OAuth2Client();

// ======================================================
// REUSABLE HELPERS
// ======================================================

const normalizeEmail = (email) => email.trim().toLowerCase();

const fail = (res, statusCode, message) =>
  res.status(statusCode).json({
    status: "fail",
    message,
  });

const sendSuccess = (res, statusCode, message, data) =>
  res.status(statusCode).json({
    status: "success",
    ...(message && { message }),
    ...(data && { data }),
  });

// Use environment-aware cookie settings so authentication works locally
// and when the frontend/backend are deployed on separate Vercel domains.
const isProduction = process.env.NODE_ENV === "production";

const jwtCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
};

const setLoggedOutCookie = (res) => {
  res.cookie("jwt", "loggedout", {
    ...jwtCookieOptions,
    expires: new Date(Date.now() + 10 * 1000),
  });
};

const createSendToken = (user, statusCode, res) => {
  const cookieDays = Number(process.env.JWT_COOKIE_EXPIRES_IN) || 90;
  const token = signToken(user._id, user.tokenVersion);

  res.cookie("jwt", token, {
    ...jwtCookieOptions,
    expires: new Date(Date.now() + cookieDays * 86400000),
  });

  return res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        photo: user.photo || "",
        role: user.role,
      },
    },
  });
};

const validatePasswordPair = (password, passwordConfirm) => {
  if (
    typeof password !== "string" ||
    typeof passwordConfirm !== "string" ||
    !password ||
    !passwordConfirm
  ) {
    return "Please provide your password and confirmation.";
  }

  if (password.length < 8) {
    return "Password must contain at least 8 characters.";
  }

  if (password !== passwordConfirm) {
    return "Passwords do not match.";
  }

  return null;
};

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const createRandomToken = () => crypto.randomBytes(32).toString("hex");

// ======================================================
// EMAIL HELPERS
// ======================================================

const sendAccountEmail = (user, content, message) =>
  sendEmail({
    email: user.email,
    subject: content.subject,
    message,
    html: content.html,
  });

const sendWelcomeEmail = async (user) => {
  const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";
  const content = welcomeEmail(user.name, frontendURL);

  const message =
    `Congratulations, ${user.name}!\n\n` +
    "Welcome to Kaduna Explorer! 🎉🎈\n\n" +
    "Discover attractions, cultural landmarks, restaurants, events, and hidden gems across Kaduna State.\n\n" +
    "Your next adventure starts here!\n\n" +
    "The Kaduna Explorer Team";

  await sendAccountEmail(user, content, message);
};

const sendWelcomeEmailSafely = async (user) => {
  try {
    await sendWelcomeEmail(user);
  } catch (error) {
    console.error("Welcome email could not be sent:", error.message);
  }
};

// ======================================================
// SIGNUP
// ======================================================

exports.signup = catchAsync(async (req, res) => {
  const { name, email, password, passwordConfirm } = req.body;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    typeof passwordConfirm !== "string"
  ) {
    return fail(
      res,
      400,
      "Please provide your name, email, password, and confirmation.",
    );
  }

  // Public signup must never assign administrator privileges.
  if (Object.prototype.hasOwnProperty.call(req.body, "role")) {
    return fail(
      res,
      403,
      "Administrator privileges cannot be assigned through public signup.",
    );
  }

  const validationError = validatePasswordPair(password, passwordConfirm);

  if (validationError) {
    return fail(res, 400, validationError);
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizeEmail(email),
    password,
    passwordConfirm,
    role: "user",
  });

  await sendWelcomeEmailSafely(user);

  return createSendToken(user, 201, res);
});

// ======================================================
// EMAIL AND PASSWORD LOGIN
// ======================================================

exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== "string" || !email.trim() || !password) {
    return fail(res, 400, "Please provide an email and password.");
  }

  const user = await User.findOne({
    email: normalizeEmail(email),
  }).select("+password +isActive");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return fail(res, 401, "Incorrect email or password.");
  }

  if (!user.isActive) {
    return fail(res, 403, "This account is no longer active.");
  }

  return createSendToken(user, 200, res);
});

// ======================================================
// GOOGLE LOGIN
// ======================================================

exports.googleLogin = catchAsync(async (req, res) => {
  const { credential } = req.body || {};

  if (typeof credential !== "string" || !credential.trim()) {
    return fail(res, 400, "Google authentication credential is required.");
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    console.error("GOOGLE_CLIENT_ID is missing from backend environment.");
    return fail(res, 500, "Google authentication is not configured.");
  }

  let payload;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });

    payload = ticket.getPayload();
  } catch (error) {
    return fail(res, 401, "Google authentication failed. Please try again.");
  }

  if (
    !payload ||
    typeof payload.sub !== "string" ||
    typeof payload.email !== "string" ||
    payload.email_verified !== true
  ) {
    return fail(res, 401, "Google account verification failed.");
  }

  const googleId = payload.sub;
  const email = normalizeEmail(payload.email);
  const name = payload.name?.trim() || email.split("@")[0];
  const photo = typeof payload.picture === "string" ? payload.picture : "";

  // 1. Find an account already linked to this Google identity.
  let user = await User.findOne({ googleId }).select("+googleId +isActive");

  if (user) {
    if (!user.isActive) {
      return fail(res, 403, "This account is no longer active.");
    }

    return createSendToken(user, 200, res);
  }

  // 2. Find an existing account using Google's verified email.
  user = await User.findOne({ email }).select("+googleId +isActive");

  if (user) {
    if (!user.isActive) {
      return fail(res, 403, "This account is no longer active.");
    }

    // Never replace a different Google identity.
    if (user.googleId && user.googleId !== googleId) {
      return fail(
        res,
        409,
        "This account is already linked to another Google account.",
      );
    }

    // Link Google to the existing account.
    // Preserve the existing password, role and profile information.
    user.googleId = googleId;
    user.authProviders.addToSet("google");

    if (!user.photo && photo) {
      user.photo = photo;
    }

    try {
      await user.save();
    } catch (error) {
      if (error.code === 11000) {
        return fail(
          res,
          409,
          "This Google account is already linked to another user.",
        );
      }

      throw error;
    }

    return createSendToken(user, 200, res);
  }

  // 3. Create a new account if no existing account is found.
  try {
    user = await User.create({
      name,
      email,
      googleId,
      authProviders: ["google"],
      photo,
      role: "user",
    });
  } catch (error) {
    // Handle simultaneous registration requests.
    if (error.code === 11000) {
      const existingGoogleUser = await User.findOne({
        googleId,
      }).select("+googleId +isActive");

      if (existingGoogleUser) {
        if (!existingGoogleUser.isActive) {
          return fail(res, 403, "This account is no longer active.");
        }

        return createSendToken(existingGoogleUser, 200, res);
      }

      const existingEmailUser = await User.findOne({
        email,
      }).select("+googleId +isActive");

      if (existingEmailUser && !existingEmailUser.isActive) {
        return fail(res, 403, "This account is no longer active.");
      }

      return fail(
        res,
        409,
        "An account with this email already exists or is being registered.",
      );
    }

    throw error;
  }

  // 4. Welcome email is sent only to newly registered Google users.
  await sendWelcomeEmailSafely(user);

  return createSendToken(user, 201, res);
});

// ======================================================
// LOGOUT
// ======================================================

exports.logout = catchAsync(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $inc: { tokenVersion: 1 },
  });

  setLoggedOutCookie(res);

  return sendSuccess(res, 200, "Logged out successfully.");
});

// ======================================================
// GET CURRENT USER
// ======================================================

exports.getMe = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return fail(res, 404, "User account could not be found.");
  }

  return sendSuccess(res, 200, undefined, { user });
});

// ======================================================
// UPDATE MY PROFILE
// ======================================================

exports.updateMe = catchAsync(async (req, res) => {
  const { name, email } = req.body;

  const forbiddenFields = [
    "password",
    "passwordConfirm",
    "role",
    "isActive",
    "tokenVersion",
  ];

  if (forbiddenFields.some((field) => field in req.body)) {
    return fail(
      res,
      400,
      "Sensitive account fields cannot be changed through profile updates.",
    );
  }

  const updates = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return fail(res, 400, "Name must be a non-empty string.");
    }

    updates.name = name.trim();
  }

  if (email !== undefined) {
    if (typeof email !== "string" || !email.trim()) {
      return fail(res, 400, "Please provide a valid email address.");
    }

    updates.email = normalizeEmail(email);
  }

  if (Object.keys(updates).length === 0) {
    return fail(res, 400, "Provide a name or email to update.");
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return fail(res, 404, "User account could not be found.");
  }

  return sendSuccess(res, 200, undefined, { user });
});

// ======================================================
// UPLOAD MY PHOTO
// ======================================================

exports.uploadMyPhoto = catchAsync(async (req, res) => {
  if (!req.file) {
    return fail(res, 400, "Please select a profile photo to upload.");
  }

  const uploadResult = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "kaduna-explorer/profile-photos",
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);

        if (!result?.secure_url || !result?.public_id) {
          return reject(
            new Error(
              "Cloudinary did not return the required profile image details.",
            ),
          );
        }

        resolve(result);
      },
    );

    Readable.from(req.file.buffer).pipe(uploadStream);
  });

  const deleteCloudinaryImageSafely = async (publicId) => {
    if (!publicId) return;

    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
      });
    } catch (error) {
      // A cleanup failure must not undo a successfully saved profile update.
      console.error("Profile image cleanup failed:", error.message);
    }
  };

  const user = await User.findById(req.user._id).select("+photoPublicId");

  if (!user) {
    await deleteCloudinaryImageSafely(uploadResult.public_id);
    return fail(res, 404, "User account could not be found.");
  }

  const previousPhotoPublicId = user.photoPublicId;

  user.photo = uploadResult.secure_url;
  user.photoPublicId = uploadResult.public_id;

  try {
    await user.save();
  } catch (error) {
    // Remove the newly uploaded asset if the database update fails.
    await deleteCloudinaryImageSafely(uploadResult.public_id);
    throw error;
  }

  // Only delete a previous Cloudinary asset. External Google profile URLs
  // have no stored Cloudinary public ID and are therefore left untouched.
  if (
    previousPhotoPublicId &&
    previousPhotoPublicId !== uploadResult.public_id
  ) {
    await deleteCloudinaryImageSafely(previousPhotoPublicId);
  }

  return sendSuccess(res, 200, "Profile photo updated successfully.", {
    user,
  });
});

// ======================================================
// UPDATE PASSWORD
// ======================================================

exports.updatePassword = catchAsync(async (req, res) => {
  const { passwordCurrent, password, passwordConfirm } = req.body;

  if (!passwordCurrent || !password || !passwordConfirm) {
    return fail(
      res,
      400,
      "Please provide your current password, new password, and confirmation.",
    );
  }

  const validationError = validatePasswordPair(password, passwordConfirm);

  if (validationError) {
    return fail(res, 400, validationError);
  }

  const user = await User.findById(req.user._id).select("+password");

  if (!user) {
    return fail(res, 401, "User no longer exists. Please log in again.");
  }

  if (!(await user.correctPassword(passwordCurrent, user.password))) {
    return fail(res, 401, "Your current password is incorrect.");
  }

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.passwordChangedAt = new Date(Date.now() - 1000);
  user.tokenVersion += 1;

  await user.save();

  try {
    const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";

    await sendAccountEmail(
      user,
      passwordChangedEmail(user.name, frontendURL),
      `Hello ${user.name},\n\n` +
        "Your Kaduna Explorer password has been changed successfully.\n\n" +
        "If you did not make this change, contact support immediately.",
    );
  } catch (error) {
    console.error(
      "Password-change notification could not be sent:",
      error.message,
    );
  }

  const updatedUser = await User.findById(user._id);

  return createSendToken(updatedUser, 200, res);
});

// ======================================================
// DEACTIVATE MY ACCOUNT
// ======================================================

exports.deactivateMe = catchAsync(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return fail(res, 400, "Please provide your current password.");
  }

  const user = await User.findById(req.user._id).select("+password +isActive");

  if (!user) {
    return fail(res, 404, "User account could not be found.");
  }

  if (!user.isActive) {
    return fail(res, 400, "This account is already inactive.");
  }

  if (user.role === "admin") {
    return fail(
      res,
      403,
      "Admin accounts must be managed through the protected admin process.",
    );
  }

  if (!(await user.correctPassword(password, user.password))) {
    return fail(res, 401, "Your current password is incorrect.");
  }

  user.isActive = false;
  user.deactivatedAt = new Date();
  user.tokenVersion += 1;

  await user.save({ validateBeforeSave: false });

  setLoggedOutCookie(res);

  return sendSuccess(res, 200, "Your account has been deactivated.");
});

// ======================================================
// FORGOT PASSWORD
// ======================================================

exports.forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (typeof email !== "string" || !email.trim()) {
    return fail(res, 400, "Please provide your email address.");
  }

  const genericResponse = {
    status: "success",
    message:
      "If your email is registered with Kaduna Explorer, you will receive password reset instructions shortly.",
  };

  const user = await User.findOne({
    email: normalizeEmail(email),
  }).select("+passwordResetToken +passwordResetExpires +isActive");

  if (!user || !user.isActive) {
    return res.status(200).json(genericResponse);
  }

  const resetToken = createRandomToken();

  user.passwordResetToken = hashToken(resetToken);
  user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);

  await user.save({ validateBeforeSave: false });

  const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";
  const resetURL = `${frontendURL}/resetPassword/${resetToken}`;
  const content = passwordResetEmail(user.name, resetURL);

  const message =
    `Hello ${user.name},\n\n` +
    "We received a request to reset your Kaduna Explorer password.\n\n" +
    `Reset your password here: ${resetURL}\n\n` +
    "This link expires in 10 minutes. If you did not request this, you can safely ignore this email.\n\n" +
    "Kaduna Explorer Team";

  try {
    await sendAccountEmail(user, content, message);
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({ validateBeforeSave: false });

    throw error;
  }

  return res.status(200).json(genericResponse);
});

// ======================================================
// RESET PASSWORD
// ======================================================

exports.resetPassword = catchAsync(async (req, res) => {
  const { token } = req.params;
  const { password, passwordConfirm } = req.body;

  if (!token || typeof token !== "string") {
    return fail(res, 400, "Please provide a valid password reset token.");
  }

  const validationError = validatePasswordPair(password, passwordConfirm);

  if (validationError) {
    return fail(res, 400, validationError);
  }

  const user = await User.findOne({
    passwordResetToken: hashToken(token),
    passwordResetExpires: { $gt: Date.now() },
  }).select("+passwordResetToken +passwordResetExpires +isActive");

  if (!user || !user.isActive) {
    return fail(
      res,
      400,
      "The reset token is invalid or has expired. Please request a new one.",
    );
  }

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.passwordChangedAt = new Date(Date.now() - 1000);
  user.tokenVersion += 1;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  try {
    const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";

    await sendAccountEmail(
      user,
      passwordChangedEmail(user.name, frontendURL),
      `Hello ${user.name},\n\n` +
        "Your Kaduna Explorer password has been reset successfully.\n\n" +
        "If you did not make this change, contact support immediately.",
    );
  } catch (error) {
    console.error(
      "Password-reset confirmation could not be sent:",
      error.message,
    );
  }

  const updatedUser = await User.findById(user._id);

  return createSendToken(updatedUser, 200, res);
});

// ======================================================
// ADMIN: GET ALL USERS
// ======================================================

exports.getAllUsers = catchAsync(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);

  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(req.query.limit, 10) || 10),
  );

  const search =
    typeof req.query.search === "string" ? req.query.search.trim() : "";

  const role = typeof req.query.role === "string" ? req.query.role : "all";
  const status =
    typeof req.query.status === "string" ? req.query.status : "all";
  const sort = typeof req.query.sort === "string" ? req.query.sort : "newest";

  if (!["all", "user", "admin"].includes(role)) {
    return fail(res, 400, "Role must be all, user, or admin.");
  }

  if (!["all", "active", "inactive"].includes(status)) {
    return fail(res, 400, "Status must be all, active, or inactive.");
  }

  if (!["newest", "oldest", "name"].includes(sort)) {
    return fail(res, 400, "Sort must be newest, oldest, or name.");
  }

  const filter = {};

  if (role !== "all") {
    filter.role = role;
  }

  if (status === "active") {
    filter.isActive = true;
  } else if (status === "inactive") {
    filter.isActive = false;
  }

  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchRegex = new RegExp(escapedSearch, "i");

    filter.$or = [
      { name: searchRegex },
      { email: searchRegex },
      {
        $expr: {
          $regexMatch: {
            input: { $toString: "$_id" },
            regex: escapedSearch,
            options: "i",
          },
        },
      },
    ];
  }

  const sortOptions =
    sort === "oldest"
      ? { createdAt: 1, _id: 1 }
      : sort === "name"
        ? { name: 1, createdAt: -1, _id: 1 }
        : { createdAt: -1, _id: -1 };

  const skip = (page - 1) * limit;

  const usersQuery = User.find(filter)
    .select(
      "_id name email photo role authProviders createdAt updatedAt +isActive +deactivatedAt",
    )
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .lean();

  if (sort === "name") {
    usersQuery.collation({ locale: "en", strength: 2 });
  }

  const [users, total] = await Promise.all([
    usersQuery,
    User.countDocuments(filter),
  ]);

  const safeUsers = users.map((user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    photo: user.photo || "",
    role: user.role,
    authProviders: user.authProviders || [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isActive: typeof user.isActive === "boolean" ? user.isActive : null,
    deactivatedAt: user.deactivatedAt || null,
  }));

  return res.status(200).json({
    status: "success",
    results: safeUsers.length,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: { users: safeUsers },
  });
});

// ======================================================
// ADMIN: GET ONE USER
// ======================================================

exports.getUser = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return fail(res, 404, "No user found with that ID.");
  }

  return sendSuccess(res, 200, undefined, { user });
});

// ======================================================
// ADMIN: UPDATE USER DETAILS
// ======================================================

exports.updateUser = catchAsync(async (req, res) => {
  const { name, email } = req.body;

  const forbiddenFields = [
    "password",
    "passwordConfirm",
    "role",
    "isActive",
    "deactivatedAt",
    "tokenVersion",
    "passwordChangedAt",
    "passwordResetToken",
    "passwordResetExpires",
  ];

  if (forbiddenFields.some((field) => field in req.body)) {
    return fail(
      res,
      400,
      "Sensitive account fields cannot be changed through this endpoint.",
    );
  }

  const updates = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return fail(res, 400, "Name must be a non-empty string.");
    }

    updates.name = name.trim();
  }

  if (email !== undefined) {
    if (typeof email !== "string" || !email.trim()) {
      return fail(res, 400, "Please provide a valid email address.");
    }

    updates.email = normalizeEmail(email);
  }

  if (Object.keys(updates).length === 0) {
    return fail(res, 400, "Provide a name or email to update.");
  }

  const user = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return fail(res, 404, "No user found with that ID.");
  }

  return sendSuccess(res, 200, "User updated successfully.", { user });
});

// ======================================================
// ADMIN: DEACTIVATE USER
// ======================================================

exports.deleteUser = catchAsync(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    return fail(
      res,
      400,
      "You cannot deactivate your own account through this endpoint.",
    );
  }

  const user = await User.findById(req.params.id).select(
    "+isActive +deactivatedAt",
  );

  if (!user) {
    return fail(res, 404, "No user found with that ID.");
  }

  if (user.role === "admin") {
    return fail(
      res,
      403,
      "Admin accounts cannot be deactivated through this endpoint.",
    );
  }

  if (!user.isActive) {
    return fail(res, 400, "This account is already inactive.");
  }

  user.isActive = false;
  user.deactivatedAt = new Date();
  user.tokenVersion += 1;

  await user.save({ validateBeforeSave: false });

  return sendSuccess(res, 200, "User deactivated successfully.");
});
