const TIME_ZONE = "Africa/Algiers";

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.(\d{1,6}))?)?$/;

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const getParts = (formatter, date) =>
  Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map(({ type, value }) => [type, value]),
  );

// Validate a calendar date without allowing overflow such as February 31.
const parseDate = (value) => {
  if (typeof value !== "string") return null;

  const match = DATE_RE.exec(value);
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (year < 1 || month < 1 || month > 12 || day < 1) {
    return null;
  }

  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);

  // Avoid Date.UTC's special handling of years 0–99.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day, timestamp };
};

const isValidDate = (value) => parseDate(value) !== null;

const assertValidDate = (value) => {
  const parsed = parseDate(value);

  if (!parsed) {
    throw new TypeError(
      `Invalid date "${value}". Expected a real YYYY-MM-DD date.`,
    );
  }

  return parsed;
};

const formatDate = (year, month, day) =>
  [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");

// Accept PostgreSQL DATEONLY strings or valid Date objects.
// For Date objects, use UTC components to avoid server-local timezone shifts.
const normalizeDate = (value) => {
  if (typeof value === "string") {
    assertValidDate(value);
    return value;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDate(
      value.getUTCFullYear(),
      value.getUTCMonth() + 1,
      value.getUTCDate(),
    );
  }

  throw new TypeError("Expected a YYYY-MM-DD string or valid Date object.");
};

// Validate a time. Seconds and fractional seconds are optional.
const isValidTime = (value) => typeof value === "string" && TIME_RE.test(value);

const assertValidTime = (value) => {
  if (!isValidTime(value)) {
    throw new TypeError(`Invalid time "${value}". Expected HH:mm or HH:mm:ss.`);
  }

  return value;
};

const normalizeTime = (value) => {
  assertValidTime(value);
  return value.slice(0, 5);
};

// Convert a valid time to minutes after midnight.
const timeToMinutes = (value) => {
  assertValidTime(value);

  const [hours, minutes] = value.split(":").map(Number);

  return hours * 60 + minutes;
};

// Current calendar date and time in Algeria, regardless of server timezone.
const getNowInAlgiers = () => {
  const now = new Date();
  const dateParts = getParts(DATE_FORMATTER, now);
  const timeParts = getParts(TIME_FORMATTER, now);

  const date = [dateParts.year, dateParts.month, dateParts.day].join("-");

  const time = `${timeParts.hour}:${timeParts.minute}:${timeParts.second}`;

  return {
    date,
    time,
    weekday: weekdayOf(date),
  };
};

// Weekday of a calendar date, independent of the server timezone.
const weekdayOf = (value) => {
  const { timestamp } = assertValidDate(value);
  return WEEKDAYS[new Date(timestamp).getUTCDay()];
};

// Add or subtract whole calendar days, including month/year boundaries.
const addDays = (value, amount) => {
  const parsed = assertValidDate(value);

  if (!Number.isSafeInteger(amount)) {
    throw new TypeError("Day offset must be a safe integer.");
  }

  const date = new Date(parsed.timestamp);
  date.setUTCDate(date.getUTCDate() + amount);

  return formatDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
};

// Signed difference: daysBetween("2026-01-01", "2026-01-03") === 2.
const daysBetween = (from, to) => {
  const start = assertValidDate(from).timestamp;
  const end = assertValidDate(to).timestamp;

  return (end - start) / 86_400_000;
};

const compareDates = (a, b) => {
  assertValidDate(a);
  assertValidDate(b);

  return a < b ? -1 : a > b ? 1 : 0;
};

const isPastDate = (date, today = getNowInAlgiers().date) =>
  compareDates(date, today) < 0;

// A same-day appointment is in the past when its time is <= current time.
// Use strict HH:mm comparisons for minute-based appointment slots.
const isPastDateTime = (date, time, now = getNowInAlgiers()) => {
  assertValidDate(date);
  assertValidTime(time);
  assertValidDate(now.date);
  assertValidTime(now.time);

  const dateComparison = compareDates(date, now.date);

  if (dateComparison !== 0) return dateComparison < 0;

  return timeToMinutes(time) <= timeToMinutes(now.time);
};

const isWithinBookingHorizon = (
  date,
  today = getNowInAlgiers().date,
  maxDaysAhead,
) => {
  if (!Number.isSafeInteger(maxDaysAhead) || maxDaysAhead < 0) {
    throw new TypeError("maxDaysAhead must be a non-negative integer.");
  }

  const difference = daysBetween(today, date);

  return difference >= 0 && difference <= maxDaysAhead;
};

module.exports = {
  TIME_ZONE,
  WEEKDAYS,
  parseDate,
  isValidDate,
  assertValidDate,
  formatDate,
  normalizeDate,
  isValidTime,
  assertValidTime,
  normalizeTime,
  timeToMinutes,
  getNowInAlgiers,
  weekdayOf,
  addDays,
  daysBetween,
  compareDates,
  isPastDate,
  isPastDateTime,
  isWithinBookingHorizon,
};
