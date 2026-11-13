const jwt = require("jsonwebtoken");

const signToken = (id, tokenVersion = 0) => {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN;

  if (!secret) {
    throw new Error("JWT_SECRET is missing from backend/.env");
  }

  if (!expiresIn) {
    throw new Error("JWT_EXPIRES_IN is missing from backend/.env");
  }

  return jwt.sign(
    {
      id: id.toString(),
      tokenVersion,
    },
    secret,
    { expiresIn },
  );
};

module.exports = signToken;
