const reportRepository = require("../../repositories/admin/report.repository");

const startOf = (unit) => {
  const date = new Date();

  if (unit === "week") {
    date.setDate(date.getDate() - date.getDay());
  }

  if (unit === "month") {
    date.setDate(1);
  }

  if (unit === "year") {
    date.setMonth(0, 1);
  }

  date.setHours(0, 0, 0, 0);

  return date;
};

const pct = (a, b) => {
  return b === 0 ? 0 : Math.round((a / b) * 100);
};

exports.getReports = async () => {
  const now = new Date();

  const thisMonth = startOf("month");
  const thisWeek = startOf("week");
  const thisYear = startOf("year");

  const lastMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1,
  );

  const lastMonthEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
  );

  const last6Months = new Date(
    now.getFullYear(),
    now.getMonth() - 5,
    1,
  );

  const [
    userStats,
    doctorStats,
    patientStats,
    appointmentStats,
    clinicStats,
    specialtyStats,
  ] = await Promise.all([
    reportRepository.getUserStats({
      thisMonth,
      lastMonth,
      lastMonthEnd,
    }),

    reportRepository.getDoctorStats(),

    reportRepository.getPatientStats({
      thisMonth,
      lastMonth,
      lastMonthEnd,
    }),

    reportRepository.getAppointmentStats({
      thisWeek,
      thisMonth,
      thisYear,
      lastMonth,
      lastMonthEnd,
      last6Months,
    }),

    reportRepository.getClinicStats(),

    reportRepository.getSpecialtyStats(),
  ]);

  const {
    totalUsers,
    totalDoctors,
    totalPatients,
    activeUsers,
    newUsersThisMonth,
    newUsersLastMonth,
  } = userStats;

  const {
    approvedDoctors,
    pendingDoctors,
    activeDoctors,
    doctorsBySpecialty,
  } = doctorStats;

  const {
    newPatientsThisMonth,
    newPatientsLastMonth,
    activePatients,
    genderMap,
  } = patientStats;

  const {
    totalAppts,
    pendingAppts,
    confirmedAppts,
    completedAppts,
    cancelledAppts,
    apptThisWeek,
    apptThisMonth,
    apptThisYear,
    apptLastMonth,
    apptByMonth,
    apptByDow,
    apptByHour,
  } = appointmentStats;

  const { totalClinics, topClinics } = clinicStats;

  const { totalSpecialties, topSpecialties } = specialtyStats;

  const completionRate = pct(completedAppts, totalAppts);
  const cancellationRate = pct(cancelledAppts, totalAppts);
  const approvalRate = pct(approvedDoctors, totalDoctors || 1);

  const userGrowthRate =
    newUsersLastMonth > 0
      ? Math.round(
          ((newUsersThisMonth - newUsersLastMonth) /
            newUsersLastMonth) *
            100,
        )
      : 100;

  const apptGrowthRate =
    apptLastMonth > 0
      ? Math.round(
          ((apptThisMonth - apptLastMonth) /
            apptLastMonth) *
            100,
        )
      : 100;

  const patientGrowthRate =
    newPatientsLastMonth > 0
      ? Math.round(
          ((newPatientsThisMonth - newPatientsLastMonth) /
            newPatientsLastMonth) *
            100,
        )
      : 100;

  return {
    generatedAt: now.toISOString(),

    users: {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      newThisMonth: newUsersThisMonth,
      growthRate: userGrowthRate,
    },

    doctors: {
      total: totalDoctors,
      approved: approvedDoctors,
      pending: pendingDoctors,
      active: activeDoctors,
      approvalRate,

      bySpecialty: doctorsBySpecialty.map((row) => ({
        specialtyId: row.specialty_id,
        specialtyName: row["Specialty.name"],
        count: parseInt(row.count, 10),
      })),
    },

    patients: {
      total: totalPatients,
      active: activePatients,
      newThisMonth: newPatientsThisMonth,
      growthRate: patientGrowthRate,

      gender: {
        male: genderMap.male ?? 0,
        female: genderMap.female ?? 0,
        unknown: genderMap.unknown ?? 0,
      },
    },

    appointments: {
      total: totalAppts,
      pending: pendingAppts,
      confirmed: confirmedAppts,
      completed: completedAppts,
      cancelled: cancelledAppts,
      thisWeek: apptThisWeek,
      thisMonth: apptThisMonth,
      thisYear: apptThisYear,
      growthRate: apptGrowthRate,
      completionRate,
      cancellationRate,

      byMonth: apptByMonth.map((row) => ({
        month: row.month,
        count: parseInt(row.count, 10),
      })),

      byDayOfWeek: apptByDow.map((row) => ({
        dow: parseInt(row.dow, 10),
        count: parseInt(row.count, 10),
      })),

      byHour: apptByHour.map((row) => ({
        hour: parseInt(row.hour, 10),
        count: parseInt(row.count, 10),
      })),
    },

    clinics: {
      total: totalClinics,

      topByVolume: topClinics.map((row) => ({
        clinicId: row["Clinic.id"],
        clinicName: row["Clinic.name"],
        count: parseInt(row.count, 10),
      })),
    },

    specialties: {
      total: totalSpecialties,

      topByAppointments: topSpecialties.map((row) => ({
        specialtyId: row.specialty_id,
        specialtyName: row.specialty_name,
        count: parseInt(row.appt_count, 10),
      })),
    },
  };
};