const SUPPORTED = ["ar", "fr", "en"];
const DEFAULT_LANG = "fr";

// Language from ?lang=, then the Accept-Language header
const getLang = (req) => {
  const raw = req.query?.lang || req.headers?.["accept-language"] || "";
  const code = String(raw).slice(0, 2).toLowerCase();
  return SUPPORTED.includes(code) ? code : DEFAULT_LANG;
};

module.exports = { getLang, SUPPORTED, DEFAULT_LANG };
