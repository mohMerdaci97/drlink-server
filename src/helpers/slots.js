const { SLOT_MINUTES, MIN_LEAD_MINUTES } = require("../constants/appointment");

const toMinutes = (time) => {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
};

const toTime = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

// Weekday name  of a YYYY-MM-DD date
exports.weekdayOf = (date) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });

// Add days to a YYYY-MM-DD date
exports.addDays = (date, days) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

// Slot start times; the last slot must end before closing time
exports.generateSlots = (start, end, duration) => {
  const step = duration || SLOT_MINUTES;
  const slots = [];
  const last = toMinutes(end.slice(0, 5)) - step;

  for (let t = toMinutes(start.slice(0, 5)); t <= last; t += step) {
    slots.push(toTime(t));
  }

  return slots;
};

// Algeria is UTC+1 all year
exports.toTimestamp = (date, time) =>
  Date.parse(`${date}T${time.slice(0, 5)}:00+01:00`);

// All slot times of one date (sorted, no duplicates)
exports.timesOfDay = ({ schedules, duration, date }) => {
  const day = exports.weekdayOf(date);

  const times = schedules
    .filter((s) => s.day_of_week === day)
    .flatMap((s) => exports.generateSlots(s.start_time, s.end_time, duration));

  return [...new Set(times)].sort();
};

// booked is a Set of "YYYY-MM-DD|HH:mm"
exports.isFree = ({ booked, date, time }) =>
  !booked.has(`${date}|${time}`) &&
  exports.toTimestamp(date, time) - Date.now() >= MIN_LEAD_MINUTES * 60000;

// First free slot in the next `days` days, or null
exports.findNextSlot = ({ schedules, booked, duration, today, days }) => {
  for (let i = 0; i < days; i++) {
    const date = exports.addDays(today, i);

    const time = exports
      .timesOfDay({ schedules, duration, date })
      .find((t) => exports.isFree({ booked, date, time: t }));

    if (time) return { date, time };
  }

  return null;
};
