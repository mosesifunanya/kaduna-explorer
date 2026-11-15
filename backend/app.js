const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const helmet = require("helmet");
const mongoSanitize = require("@exortek/express-mongo-sanitize");

const connectDB = require("./config/database");

const authRoutes = require("./routes/authRoutes");
const destinationRoutes = require("./routes/destinationRoutes");
const homepageRoutes = require("./routes/homepageRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const tripRoutes = require("./routes/tripRoutes");

const eventRoutes = require("./routes/eventRoutes");
const eventFavoriteRoutes = require("./routes/eventFavoriteRoutes");
const eventReviewRoutes = require("./routes/eventReviewRoutes");
const eventCommentRoutes = require("./routes/eventCommentRoutes");
const eventBannerRoutes = require("./routes/eventBannerRoutes");

const newsletterRoutes = require("./routes/newsletterRoutes");

const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");

const app = express();

app.disable("x-powered-by");

// Trust Vercel's reverse proxy.
app.set("trust proxy", 1);

// ============================================
// SECURITY HEADERS
// ============================================

app.use(helmet());

// ============================================
// CORS CONFIGURATION
// ============================================

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Allow requests without an Origin header,
    // such as server-to-server calls.
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.replace(/\/+$/, "");

    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    console.warn(
      `CORS blocked origin: ${normalizedOrigin}. Allowed origins: ${allowedOrigins.join(", ")}`,
    );

    return callback(new AppError("This origin is not allowed by CORS.", 403));
  },

  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// ============================================
// GLOBAL MIDDLEWARE
// ============================================

app.use(compression());

app.use(express.json({ limit: "100kb" }));

app.use(cookieParser());

// Protect against MongoDB injection.
app.use(mongoSanitize());

// ============================================
// HEALTH CHECK
// ============================================

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Kaduna Explorer API is healthy.",
  });
});

// ============================================
// API WELCOME ROUTE
// ============================================

app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Welcome to Kaduna Explorer API!",
  });
});

// ============================================
// DATABASE CONNECTION
// ============================================

app.use("/api/v1", async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// ============================================
// API ROUTES
// ============================================

app.use("/api/v1/users", authRoutes);

app.use("/api/v1/destinations", destinationRoutes);

app.use("/api/v1/homepage", homepageRoutes);

app.use("/api/v1/reviews", reviewRoutes);

app.use("/api/v1/favorites", favoriteRoutes);

app.use("/api/v1/trips", tripRoutes);

// ============================================
// NEWSLETTER API ROUTES
// ============================================

app.use("/api/v1/newsletter", newsletterRoutes);

// ============================================
// EVENT API ROUTES
// ============================================

app.use("/api/v1/events", eventRoutes);

app.use("/api/v1/event-favorites", eventFavoriteRoutes);

app.use("/api/v1/event-reviews", eventReviewRoutes);

app.use("/api/v1/event-comments", eventCommentRoutes);

// ============================================
// EVENT BANNER API ROUTES
// ============================================

app.use("/api/v1/event-banners", eventBannerRoutes);

// ============================================
// HANDLE UNKNOWN ROUTES
// ============================================

app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// ============================================
// GLOBAL ERROR HANDLER
// Keep this middleware last.
// ============================================

app.use(globalErrorHandler);

module.exports = app;
