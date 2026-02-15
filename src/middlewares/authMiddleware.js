const jwt = require("jsonwebtoken");

module.exports = (roles = []) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Accès refusé. Token manquant."
      });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;

      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({
          message: "Accès interdit. Permissions insuffisantes."
        });
      }

      next();
    } catch (err) {
      return res.status(401).json({
        message: "Token invalide ou expiré."
      });
    }
  };
};
