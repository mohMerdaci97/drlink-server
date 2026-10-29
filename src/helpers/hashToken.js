const crypto = require("crypto");

// Refresh tokens are stored as SHA-256 hashes not plain text
module.exports = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");
