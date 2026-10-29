const homeRepository = require("../../repositories/patient/patientHome.repository");
const {
  getNowInAlgiers,
  daysBetween,
} = require("../../helpers/patientHomeContext");

const SPECIALTIES_LIMIT = 8;
const DOCTORS_LIMIT = 6;
const CLINICS_LIMIT = 6;
const UPCOMING_LIMIT = 3;

// Helpers privés
const locationName = (entity, lang) =>
  lang === "fr" ? entity?.name_fr : entity?.name_ar;

const toNumberMap = (rows, keyField) =>
  rows.reduce((acc, row) => {
    acc[row[keyField]] = Number(row.count);
    return acc;
  }, {});

const formatSpecialty = (specialty, doctorsBySpecialty) => ({
  id: specialty.id,
  name: specialty.name,
  doctors_count: doctorsBySpecialty[specialty.id] || 0,
});

const formatClinic = (clinic, lang, doctorsByClinic) => ({
  id: clinic.id,
  name: clinic.name,
  address: clinic.address || null,
  photo_url: clinic.photo_url || null,
  wilaya: locationName(clinic.wilaya, lang) || null,
  commune: locationName(clinic.commune, lang) || null,
  doctors_count: doctorsByClinic[clinic.id] || 0,
});

/**
 * available     = le médecin consulte aujourd'hui dans sa première clinique.
 * available_now = aujourd'hui ET l'heure actuelle est dans le créneau.
 * Les heures sont des chaînes "HH:mm" ou "HH:mm:ss" : la comparaison de chaînes suffit.
 */
const formatDoctor = (doctor, lang, now) => {
  const clinic = doctor.Clinics?.[0];
  const schedule = clinic?.DoctorClinic;

  const availableToday = schedule?.day_of_week === now.weekday;

  const startTime = schedule?.start_time?.slice(0, 5) || null;
  const endTime = schedule?.end_time?.slice(0, 5) || null;

  const availableNow =
    availableToday &&
    startTime &&
    endTime &&
    now.time >= startTime &&
    now.time < endTime;

  return {
    id: doctor.id,
    name: doctor.user?.full_name || "",
    specialty: doctor.Specialty?.name || "",
    photo_url: doctor.photo_url || null,

    location:
      locationName(clinic?.commune, lang) ||
      locationName(clinic?.wilaya, lang) ||
      clinic?.name ||
      null,

    clinic: clinic
      ? {
          id: clinic.id,
          name: clinic.name,
          photo_url: clinic.photo_url || null,
        }
      : null,
    clinics_count: doctor.Clinics?.length || 0,

    working_day: schedule?.day_of_week || null,
    start_time: startTime,
    end_time: endTime,

    available: availableToday,
    available_now: Boolean(availableNow),
  };
};

const formatAppointment = (appointment, today) => {
  const daysUntil = daysBetween(today, appointment.appointment_date);

  return {
    id: appointment.id,
    doctor_name: appointment.Doctor?.user?.full_name || "",
    specialty: appointment.Doctor?.Specialty?.name || "",
    doctor_photo_url: appointment.Doctor?.photo_url || null,
    clinic_name: appointment.Clinic?.name || "",
    clinic_address: appointment.Clinic?.address || null,
    clinic_photo_url: appointment.Clinic?.photo_url || null,
    date: appointment.appointment_date,
    time: appointment.appointment_time?.slice(0, 5) || null,
    status: appointment.status,
    days_until: daysUntil,
    is_today: daysUntil === 0,
  };
};

const formatAppointmentsSummary = (rows, upcomingCount) => {
  const byStatus = toNumberMap(rows, "status");

  return {
    total: Object.values(byStatus).reduce((sum, n) => sum + n, 0),
    upcoming: upcomingCount,
    pending: byStatus.pending || 0,
    confirmed: byStatus.confirmed || 0,
    completed: byStatus.completed || 0,
    cancelled: byStatus.cancelled || 0,
  };
};

// ── Service ─────────────────────────────────────────

exports.getHomeData = async (userId, lang) => {
  const patient = await homeRepository.findPatientByUserId(userId);

  if (!patient) {
    const error = new Error("Patient introuvable.");
    error.statusCode = 404;
    throw error;
  }

  const now = getNowInAlgiers();

  const [
    totalDoctors,
    totalSpecialties,
    totalClinics,
    totalPatients,
    specialties,
    doctorsBySpecialtyRows,
    doctors,
    clinics,
    upcomingAppointments,
    appointmentsByStatus,
  ] = await Promise.all([
    homeRepository.countApprovedDoctors(),
    homeRepository.countSpecialties(),
    homeRepository.countClinics(),
    homeRepository.countPatients(),
    homeRepository.findSpecialties({ limit: SPECIALTIES_LIMIT }),
    homeRepository.countDoctorsBySpecialty(),
    homeRepository.findFeaturedDoctors({ lang, limit: DOCTORS_LIMIT }),
    homeRepository.findFeaturedClinics({ lang, limit: CLINICS_LIMIT }),
    homeRepository.findUpcomingAppointments({
      patientId: patient.id,
      today: now.date,
      nowTime: now.time,
      limit: UPCOMING_LIMIT,
    }),
    homeRepository.countAppointmentsByStatus(patient.id),
  ]);

  const doctorsBySpecialty = toNumberMap(
    doctorsBySpecialtyRows,
    "specialty_id",
  );

  const doctorsByClinic = toNumberMap(
    await homeRepository.countDoctorsByClinicIds(clinics.map((c) => c.id)),
    "clinic_id",
  );

  const formattedDoctors = doctors.map((d) => formatDoctor(d, lang, now));
  const formattedAppointments = upcomingAppointments.map((a) =>
    formatAppointment(a, now.date),
  );

  return {
    patient: {
      name: patient.user?.full_name || "",
      appointments: formatAppointmentsSummary(
        appointmentsByStatus,
        formattedAppointments.length,
      ),
    },
    stats: {
      total_doctors: totalDoctors,
      total_specialties: totalSpecialties,
      total_clinics: totalClinics,
      total_patients: totalPatients,
      available_today: formattedDoctors.filter((d) => d.available).length,
    },
    specialties: specialties.map((s) => formatSpecialty(s, doctorsBySpecialty)),
    doctors: formattedDoctors,
    clinics: clinics.map((c) => formatClinic(c, lang, doctorsByClinic)),

    upcoming_appointment: formattedAppointments[0] || null,
    upcoming_appointments: formattedAppointments,
  };
};
