const patientDoctorRepository = require("../../repositories/patient/patientDoctor.repository");
const createError = require("../../helpers/httpError");
const { getNowInAlgiers, daysBetween } = require("../../helpers/dateTime");
const {
  weekdayOf,
  addDays,
  timesOfDay,
  isFree,
  findNextSlot,
} = require("../../helpers/slots");
const { SLOT_MINUTES, MAX_DAYS_AHEAD } = require("../../constants/appointment");
const {
  NEXT_SLOT_DAYS,
  CALENDAR_DAYS,
  NEARBY_DEFAULT_RADIUS_KM,
  NEARBY_MAX_RADIUS_KM,
  NEARBY_CLINICS_LIMIT,
  NEARBY_DOCTORS_LIMIT,
  SUGGESTIONS_LIMIT,
} = require("../../constants/doctorSearch");

const WEEK_ORDER = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

//  Private helpers

const locationName = (entity, lang) =>
  lang === "fr" ? entity?.name_fr : entity?.name_ar;

const hhmm = (time) => (time ? time.slice(0, 5) : null);

const groupBy = (rows, key) =>
  rows.reduce((groups, row) => {
    (groups[row[key]] ||= []).push(row);
    return groups;
  }, {});

const toBookedSet = (rows) =>
  new Set(rows.map((r) => `${r.appointment_date}|${hhmm(r.appointment_time)}`));

// Put items in the same order as ids
const sortByIds = (items, ids) => {
  const byId = new Map(items.map((item) => [item.id, item]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
};

const periodOf = (time) => {
  const hour = Number(time.slice(0, 2));

  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
};

const formatSchedule = (s) => ({
  day_of_week: s.day_of_week,
  start_time: hhmm(s.start_time),
  end_time: hhmm(s.end_time),
});

const bySchedule = (a, b) =>
  WEEK_ORDER.indexOf(a.day_of_week) - WEEK_ORDER.indexOf(b.day_of_week) ||
  a.start_time.localeCompare(b.start_time);

const getBookableDoctorOrFail = async (doctorId) => {
  const doctor = await patientDoctorRepository.findBookableDoctor(doctorId);

  if (!doctor) throw createError(404, "Médecin introuvable.");

  return doctor;
};

// Schedules and booked slots of many doctors, for the next days
const loadAvailability = async (doctorIds, today) => {
  const [schedules, booked] = await Promise.all([
    patientDoctorRepository.findSchedulesByDoctorIds(doctorIds),
    patientDoctorRepository.findBookedByDoctorIds({
      doctorIds,
      from: today,
      to: addDays(today, NEXT_SLOT_DAYS),
    }),
  ]);

  return {
    schedulesByDoctor: groupBy(schedules, "doctor_id"),
    bookedByDoctor: groupBy(booked, "doctor_id"),
  };
};

const nextSlotOf = (doctor, availability, today) =>
  findNextSlot({
    schedules: availability.schedulesByDoctor[doctor.id] || [],
    booked: toBookedSet(availability.bookedByDoctor[doctor.id] || []),
    duration: doctor.slot_duration,
    today,
    days: NEXT_SLOT_DAYS,
  });

// Card used by the list and the nearby screens
const formatDoctorCard = (doctor, clinic, lang, availability, now) => {
  const nextSlot = nextSlotOf(doctor, availability, now.date);

  return {
    id: doctor.id,
    name: doctor.user?.full_name || "",
    specialty_id: doctor.specialty_id,
    specialty: doctor.Specialty?.name || "",
    description: doctor.description || null,
    photo_url: doctor.photo_url || null,
    location:
      locationName(clinic?.commune, lang) ||
      locationName(clinic?.wilaya, lang) ||
      clinic?.name ||
      null,
    wilaya_id: clinic?.wilaya_id ?? null,
    clinic_id: clinic?.id ?? null,
    clinic_name: clinic?.name ?? null,
    clinic_address: clinic?.address ?? null,
    clinic_photo_url: clinic?.photo_url ?? null,
    slot_duration: doctor.slot_duration || SLOT_MINUTES,
    // No reviews table yet: placeholders, not fake values
    rating: null,
    reviews: 0,
    available_today: nextSlot?.date === now.date,
    next_slot: nextSlot,
  };
};

// What this patient already did with this doctor
const loadHistory = async (userId, doctorId, now) => {
  if (!userId) return null;

  const patient = await patientDoctorRepository.findPatientByUserId(userId);
  if (!patient) return null;

  const [completedCount, upcoming] = await Promise.all([
    patientDoctorRepository.countCompletedWithDoctor(patient.id, doctorId),
    patientDoctorRepository.findUpcomingWithDoctor({
      patientId: patient.id,
      doctorId,
      today: now.date,
      nowTime: now.time,
    }),
  ]);

  return {
    visited_before: completedCount > 0,
    visits_count: completedCount,
    upcoming_appointment: upcoming
      ? {
          id: upcoming.id,
          date: upcoming.appointment_date,
          time: hhmm(upcoming.appointment_time),
          status: upcoming.status,
        }
      : null,
  };
};

// ── Service ─────────────────────────────────────────

exports.getDoctors = async ({
  specialtyId,
  wilayaId,
  communeId,
  search,
  availableToday,
  sort,
  page,
  limit,
  offset,
  lang,
}) => {
  const now = getNowInAlgiers();
  const emptyPage = { doctors: [], total: 0, page, pages: 0 };

  // "Today" filter keeps doctors who work today (free slots are checked on the card)
  const worksToday = String(availableToday) === "true";

  const doctorIds = await patientDoctorRepository.findDoctorIdsByClinicFilter({
    wilayaId,
    communeId,
    workingDay: worksToday ? now.weekday : null,
  });

  if (doctorIds && !doctorIds.length) return emptyPage;

  const { count, rows } = await patientDoctorRepository.findDoctorPage({
    doctorIds,
    specialtyId,
    search,
    sort,
    limit,
    offset,
  });

  const ids = rows.map((r) => r.id);
  if (!ids.length) return { ...emptyPage, total: count };

  const [doctors, availability] = await Promise.all([
    patientDoctorRepository.findDoctorsWithClinics({ ids, lang }),
    loadAvailability(ids, now.date),
  ]);

  return {
    doctors: sortByIds(doctors, ids).map((d) =>
      formatDoctorCard(d, d.Clinics?.[0], lang, availability, now),
    ),
    total: count,
    page,
    pages: Math.ceil(count / limit),
  };
};

exports.getDoctorDetail = async (userId, doctorId, lang) => {
  const doctor = await patientDoctorRepository.findDoctorById(doctorId, lang);

  if (!doctor) throw createError(404, "Médecin introuvable.");

  const now = getNowInAlgiers();

  const [availability, myHistory] = await Promise.all([
    loadAvailability([doctor.id], now.date),
    loadHistory(userId, doctor.id, now),
  ]);

  const schedules = availability.schedulesByDoctor[doctor.id] || [];
  const booked = toBookedSet(availability.bookedByDoctor[doctor.id] || []);

  const nextSlotFor = (list) =>
    findNextSlot({
      schedules: list,
      booked,
      duration: doctor.slot_duration,
      today: now.date,
      days: NEXT_SLOT_DAYS,
    });

  const clinics = (doctor.Clinics || []).map((c) => {
    const clinicSchedules = schedules.filter((s) => s.clinic_id === c.id);

    return {
      id: c.id,
      name: c.name,
      address: c.address,
      phone: c.phone,
      photo_url: c.photo_url || null,
      latitude: c.latitude,
      longitude: c.longitude,
      wilaya: locationName(c.wilaya, lang) || null,
      commune: locationName(c.commune, lang) || null,
      schedule: clinicSchedules.map(formatSchedule).sort(bySchedule),
      next_slot: nextSlotFor(clinicSchedules),
    };
  });

  const nextSlot = nextSlotFor(schedules);

  return {
    id: doctor.id,
    name: doctor.user?.full_name || "",
    specialty: doctor.Specialty?.name || "",
    specialty_id: doctor.specialty_id,
    description: doctor.description || null,
    photo_url: doctor.photo_url || null,
    slot_duration: doctor.slot_duration || SLOT_MINUTES,
    rating: null,
    reviews: 0,
    available_today: nextSlot?.date === now.date,
    next_slot: nextSlot,
    clinics,
    my_history: myHistory,
  };
};

// Slots of one day, with available true/false and a reason when empty
exports.getAvailableSlots = async ({ doctorId, clinicId, date }) => {
  const doctor = await getBookableDoctorOrFail(doctorId);
  const now = getNowInAlgiers();

  const base = {
    date,
    day_of_week: weekdayOf(date),
    clinic_id: Number(clinicId),
    doctor_id: doctor.id,
    slot_duration: doctor.slot_duration || SLOT_MINUTES,
  };

  const empty = (reason) => ({
    ...base,
    working_hours: [],
    slots: [],
    available_count: 0,
    available: false,
    reason,
  });

  if (date < now.date) return empty("past");

  if (daysBetween(now.date, date) > MAX_DAYS_AHEAD) return empty("too_far");

  const schedules = await patientDoctorRepository.findSchedules(
    doctor.id,
    clinicId,
  );

  const times = timesOfDay({
    schedules,
    duration: doctor.slot_duration,
    date,
  });

  if (!times.length) return empty("no_schedule");

  const booked = toBookedSet(
    await patientDoctorRepository.findBookedByDoctorIds({
      doctorIds: [doctor.id],
      from: date,
      to: date,
    }),
  );

  const slots = times.map((time) => ({
    time,
    period: periodOf(time),
    available: isFree({ booked, date, time }),
  }));

  const availableCount = slots.filter((s) => s.available).length;

  return {
    ...base,
    working_hours: schedules
      .filter((s) => s.day_of_week === base.day_of_week)
      .map((s) => ({ start_time: hhmm(s.start_time), end_time: hhmm(s.end_time) })),
    slots,
    available_count: availableCount,
    available: availableCount > 0,
    reason: availableCount > 0 ? null : "fully_booked",
  };
};

// Days with at least one free slot (for the calendar)
exports.getAvailableDays = async ({ doctorId, clinicId }) => {
  const doctor = await getBookableDoctorOrFail(doctorId);
  const now = getNowInAlgiers();

  const [schedules, bookedRows] = await Promise.all([
    patientDoctorRepository.findSchedules(doctor.id, clinicId),
    patientDoctorRepository.findBookedByDoctorIds({
      doctorIds: [doctor.id],
      from: now.date,
      to: addDays(now.date, CALENDAR_DAYS),
    }),
  ]);

  const booked = toBookedSet(bookedRows);
  const days = [];

  for (let i = 0; i < CALENDAR_DAYS; i++) {
    const date = addDays(now.date, i);

    const free = timesOfDay({
      schedules,
      duration: doctor.slot_duration,
      date,
    }).filter((time) => isFree({ booked, date, time }));

    if (free.length) days.push({ date, available_slots: free.length });
  }

  return { days };
};

exports.getNearbyDoctors = async ({
  latitude,
  longitude,
  radius,
  specialtyId,
  lang,
}) => {
  const radiusKm = Math.min(
    Number(radius) || NEARBY_DEFAULT_RADIUS_KM,
    NEARBY_MAX_RADIUS_KM,
  );

  const clinics = await patientDoctorRepository.findClinicsInRadius({
    latitude,
    longitude,
    radiusKm,
    lang,
    limit: NEARBY_CLINICS_LIMIT,
  });

  const empty = { doctors: [], radius_km: radiusKm };
  if (!clinics.length) return empty;

  const clinicById = new Map(clinics.map((c) => [c.id, c]));
  const distanceOf = (clinic) => Number(clinic.get("distance_km"));

  const links = await patientDoctorRepository.findDoctorClinicLinks(
    clinics.map((c) => c.id),
  );

  const { rows } = await patientDoctorRepository.findDoctorPage({
    doctorIds: [...new Set(links.map((l) => l.doctor_id))],
    specialtyId,
    sort: "newest",
    limit: NEARBY_DOCTORS_LIMIT,
    offset: 0,
  });

  const ids = rows.map((r) => r.id);
  if (!ids.length) return empty;

  const now = getNowInAlgiers();

  const [doctors, availability] = await Promise.all([
    patientDoctorRepository.findDoctorsBasic(ids),
    loadAvailability(ids, now.date),
  ]);

  const result = doctors.map((d) => {
    // Nearest clinic of this doctor inside the radius
    const nearest = links
      .filter((l) => l.doctor_id === d.id)
      .map((l) => clinicById.get(l.clinic_id))
      .reduce(
        (best, c) => (!best || distanceOf(c) < distanceOf(best) ? c : best),
        null,
      );

    return {
      ...formatDoctorCard(d, nearest, lang, availability, now),
      lat: Number(nearest.latitude),
      lng: Number(nearest.longitude),
      distance_km: Math.round(distanceOf(nearest) * 10) / 10,
    };
  });

  result.sort((a, b) => a.distance_km - b.distance_km);

  return { doctors: result, radius_km: radiusKm };
};

// Search bar suggestions: specialties and doctors
exports.getSuggestions = async (text) => {
  const [specialties, page] = await Promise.all([
    patientDoctorRepository.findSpecialtiesByName(text, SUGGESTIONS_LIMIT),
    patientDoctorRepository.findDoctorPage({
      search: text,
      sort: "name",
      limit: SUGGESTIONS_LIMIT,
      offset: 0,
    }),
  ]);

  const ids = page.rows.map((r) => r.id);

  const doctors = ids.length
    ? sortByIds(await patientDoctorRepository.findDoctorsBasic(ids), ids)
    : [];

  return {
    specialties: specialties.map((s) => ({ id: s.id, name: s.name })),
    doctors: doctors.map((d) => ({
      id: d.id,
      name: d.user?.full_name || "",
      specialty: d.Specialty?.name || "",
      photo_url: d.photo_url || null,
    })),
  };
};

exports.getSpecialties = async () => {
  const [specialties, counts] = await Promise.all([
    patientDoctorRepository.findSpecialties(),
    patientDoctorRepository.countDoctorsBySpecialty(),
  ]);

  const countBySpecialty = Object.fromEntries(
    counts.map((r) => [r.specialty_id, Number(r.count)]),
  );

  return {
    specialties: specialties.map((s) => ({
      id: s.id,
      name: s.name,
      doctors_count: countBySpecialty[s.id] || 0,
    })),
  };
};

exports.getWilayas = async (lang) => {
  const wilayas = await patientDoctorRepository.findWilayas(lang);

  return {
    wilayas: wilayas.map((w) => ({
      id: w.id,
      code: w.code,
      name: locationName(w, lang),
    })),
  };
};

exports.getCommunes = async (wilayaId, lang) => {
  const communes = await patientDoctorRepository.findCommunes(wilayaId, lang);

  return {
    communes: communes.map((c) => ({
      id: c.id,
      name: locationName(c, lang),
    })),
  };
};