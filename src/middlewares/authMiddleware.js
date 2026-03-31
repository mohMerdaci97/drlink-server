const jwt = require("jsonwebtoken");

module.exports = (roles = []) => {
  return (req, res, next) => {
    const token = req.cookies.access_token;

    if (!token) {
      return res.status(401).json({ message: "Non autorisé." });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;

      // Role check
      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ message: "Accès interdit." });
      }

      next();
    } catch (err) {
      return res.status(401).json({
        message:
          err.name === "TokenExpiredError"
            ? "Session expirée."
            : "Token invalide.",
      });
    }
  };
};
