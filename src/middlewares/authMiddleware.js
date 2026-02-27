const jwt = require("jsonwebtoken");

module.exports = (roles = []) => {
  return (req, res, next) => {
    console.log("Auth middleware started");

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log("No Authorization header");
      return res.status(401).json({ message: "Accès refusé. Token manquant." });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      console.log("No token after Bearer");
      return res.status(401).json({ message: "Token manquant." });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded JWT:", decoded);

      req.user = decoded;

      if (roles.length && !roles.includes(decoded.role)) {
        console.log("Role not allowed:", decoded.role);
        return res.status(403).json({ message: "Permissions insuffisantes." });
      }

      console.log("Auth middleware passing to next()");
      next();
    } catch (err) {
      console.error("JWT error:", err);
      return res.status(401).json({ message: "Token invalide ou expiré." });
    }
  };
};
