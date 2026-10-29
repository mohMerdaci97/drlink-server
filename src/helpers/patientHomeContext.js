const TIME_ZONE = "Africa/Algiers";

/**
 * Langue de réponse : "ar" par défaut, "fr" si demandée, sinon "ar".
 * Seules ces deux langues existent côté Wilaya/Commune (name_ar / name_fr).
 */
exports.getLang = (req) => {
  const raw =
    req.headers["accept-language"]?.split(",")[0]?.split("-")[0]?.toLowerCase();

  return raw === "fr" ? "fr" : "ar";
};


exports.getNowInAlgiers = (date = new Date()) => {
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
  }).format(date); // YYYY-MM-DD

  const timeStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date); // HH:mm

  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "long",
  }).format(date); // Monday, Tuesday...

  return { date: dateStr, time: timeStr, weekday };
};


exports.daysBetween = (from, to) => {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);

  return Math.round((b - a) / MS_PER_DAY);
};