const repository = require("../../repositories/assistant/assistantDashboard.repository");

const getAlgeriaDate = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Algiers",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
};

exports.getDashboardSummary = async (userId) => {
  const assistant = await repository.findAssistantByUserId(userId);

  if (!assistant) {
    const error = new Error("Assistant introuvable.");
    error.statusCode = 404;
    throw error;
  }

  const doctorId = assistant.doctor_id;
  const today = getAlgeriaDate();

  const summary = await repository.getDashboardSummary({
    doctorId,
    today,
  });

  return {
    totalPatients: summary.totalPatients,
    todayAppointments: summary.todayAppointments,
    pendingAppointments: summary.pendingAppointments,
  };
};
