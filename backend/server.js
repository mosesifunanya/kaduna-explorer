require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/database");
const mongoose = require("mongoose");
const { cleanupExpiredEvents } = require("./controllers/eventController");

const PORT = process.env.PORT || 5000;
const EVENT_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const SHUTDOWN_TIMEOUT_MS = 10000;

// ============================================
// SERVER STARTUP
// ============================================

const startServer = async () => {
  let server;
  let cleanupInterval;
  let isShuttingDown = false;
  let cleanupInProgress = false;
  let cleanupPromise = null;

  // ============================================
  // EVENT CLEANUP
  // ============================================

  const runEventCleanup = async () => {
    if (isShuttingDown || cleanupInProgress) return;

    cleanupInProgress = true;

    cleanupPromise = (async () => {
      try {
        await cleanupExpiredEvents();
      } catch (err) {
        console.error("Automatic expired-event cleanup failed:", err.message);
      } finally {
        cleanupInProgress = false;
        cleanupPromise = null;
      }
    })();

    await cleanupPromise;
  };

  // ============================================
  // GRACEFUL SHUTDOWN
  // ============================================

  const shutdown = async (signal) => {
    if (isShuttingDown) return;

    isShuttingDown = true;

    console.log(`\n${signal} received. Shutting down gracefully...`);

    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }

    const forceExit = setTimeout(() => {
      console.error("Shutdown timed out. Forcing process exit.");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    try {
      // Stop accepting new HTTP connections.
      if (server) {
        await new Promise((resolve, reject) => {
          server.close((err) => {
            if (err) return reject(err);
            resolve();
          });
        });
      }

      // Wait for any currently running cleanup operation.
      if (cleanupPromise) {
        await cleanupPromise;
      }

      // Close MongoDB connection.
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }

      clearTimeout(forceExit);

      console.log("Server and database connection closed.");

      process.exit(0);
    } catch (err) {
      clearTimeout(forceExit);

      console.error("Error during shutdown:", err.message);

      process.exit(1);
    }
  };

  // ============================================
  // DATABASE CONNECTION EVENTS
  // ============================================

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected.");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("MongoDB reconnected.");
  });

  // ============================================
  // PROCESS SIGNAL HANDLERS
  // ============================================

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  // ============================================
  // CONNECT TO DATABASE AND START SERVER
  // ============================================

  try {
    await connectDB();

    console.log("MongoDB Atlas connection successful!");

    // Run expired-event cleanup immediately.
    await runEventCleanup();

    // Repeat cleanup every 5 minutes during local development.
    cleanupInterval = setInterval(() => {
      runEventCleanup();
    }, EVENT_CLEANUP_INTERVAL_MS);

    cleanupInterval.unref();

    // Start HTTP server.
    server = app.listen(PORT, () => {
      console.log(`Kaduna Explorer API running on port ${PORT}`);
      console.log(`API base URL: http://localhost:${PORT}/api/v1`);
    });

    server.on("error", (err) => {
      console.error("HTTP server error:", err.message);
      shutdown("HTTP_SERVER_ERROR");
    });
  } catch (err) {
    console.error("Startup failed:", err.message);

    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }

    await mongoose.disconnect().catch(() => {});

    process.exitCode = 1;
  }
};

// ============================================
// UNHANDLED PROMISE REJECTIONS
// ============================================

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);

  process.exitCode = 1;
});

// ============================================
// UNCAUGHT EXCEPTIONS
// ============================================

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);

  process.exit(1);
});

// ============================================
// START APPLICATION
// ============================================

startServer();
