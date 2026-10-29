module.exports = {
  STATUS: {
    PENDING: "pending",
    CONFIRMED: "confirmed",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
  },
  ACTIVE_STATUSES: ["pending", "confirmed"],
  SLOT_MINUTES: 30,
  CANCEL_MIN_HOURS: 2,
  MAX_DAYS_AHEAD: 90,
  MAX_ACTIVE_PER_PATIENT: 5,
  AVAILABLE_DAYS_WINDOW: 14,
};
