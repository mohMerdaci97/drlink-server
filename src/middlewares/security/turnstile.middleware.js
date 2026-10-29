const turnstileService = require("../../services/cloudflare/turnstile.service");

module.exports = async (req, res, next) => {
  try {
    const token = req.body?.turnstileToken;

    const result = await turnstileService.verify({
      token,
      remoteIp: req.ip,
    });

    if (!result.success) {
      return res.status(403).json({
        success: false,
        message: "Vérification anti-robot invalide.",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
