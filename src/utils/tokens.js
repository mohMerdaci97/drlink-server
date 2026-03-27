const jwt = require("jsonwebtoken");

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!ACCESS_SECRET)
  throw new Error("JWT_SECRET is not defined in environment variables!");
if (!REFRESH_SECRET)
  throw new Error(
    "JWT_REFRESH_SECRET is not defined in environment variables!",
  );

exports.generateAccessToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role }, ACCESS_SECRET, {
    expiresIn: "15m",
  });
};

exports.generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role }, REFRESH_SECRET, {
    expiresIn: "7d",
  });
};
