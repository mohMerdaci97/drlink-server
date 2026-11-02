module.exports = {
  STATUS: {
    PENDING: "pending",
    CONFIRMED: "confirmed",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
  },
  // Only these block a slot or count toward limits (future ones only)
  ACTIVE_STATUSES: ["pending", "confirmed"],
  SLOT_MINUTES: 30,
  MIN_LEAD_MINUTES: 30,
  CANCEL_MIN_HOURS: 2,
  MAX_DAYS_AHEAD: 90,
  MAX_ACTIVE_PER_PATIENT: 5,
  MAX_ACTIVE_PER_DOCTOR: 2,
  AVAILABLE_DAYS_WINDOW: 14,
  CLOSE_JOB_INTERVAL_MS: 10 * 60 * 1000,
};
