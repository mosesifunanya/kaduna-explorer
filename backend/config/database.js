const mongoose = require("mongoose");

let connectionPromise = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  if (!process.env.DATABASE) {
    throw new Error("DATABASE is missing from environment variables.");
  }

  if (!process.env.DATABASE_PASSWORD) {
    throw new Error("DATABASE_PASSWORD is missing from environment variables.");
  }

  const DB = process.env.DATABASE.replace(
    "<PASSWORD>",
    encodeURIComponent(process.env.DATABASE_PASSWORD),
  );

  if (DB.includes("<PASSWORD>")) {
    throw new Error(
      "DATABASE still contains <PASSWORD>. Check your connection string.",
    );
  }

  connectionPromise = mongoose
    .connect(DB)
    .then(() => {
      return mongoose;
    })
    .catch((error) => {
      connectionPromise = null;
      throw error;
    });

  return connectionPromise;
};

module.exports = connectDB;
