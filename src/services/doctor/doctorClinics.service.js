const repository = require("../../repositories/doctor/doctorClinics.repository");

const fs = require("fs");
const path = require("path");

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DAYS_FR = {
  Sunday: "Dimanche",
  Monday: "Lundi",
  Tuesday: "Mardi",
  Wednesday: "Mercredi",
  Thursday: "Jeudi",
  Friday: "Vendredi",
  Saturday: "Samedi",
};

const clinicUploadPath = path.join(__dirname, "../../uploads/clinics");

/* =========================================================
   HELPERS
========================================================= */

const getDoctor = async (userId) => {
  const doctor = await repository.findDoctorByUserId(userId);

  if (!doctor) {
    const error = new Error("Profil médecin introuvable.");
    error.status = 404;
    throw error;
  }

  return doctor;
};

const parseClinicId = (clinicId) => {
  const id = parseInt(clinicId, 10);

  if (Number.isNaN(id)) {
    const error = new Error("Identifiant du cabinet invalide.");
    error.status = 400;
    throw error;
  }

  return id;
};

const parseScheduleId = (scheduleId) => {
  const id = parseInt(scheduleId, 10);

  if (Number.isNaN(id)) {
    const error = new Error("Identifiant de l'horaire invalide.");
    error.status = 400;
    throw error;
  }

  return id;
};

const fmtTime = (time) => {
  return time ? time.slice(0, 5) : null;
};

const fmtCoord = (value) => {
  return value != null ? parseFloat(value) : null;
};

const deleteClinicPhoto = (photo) => {
  if (!photo) return;

  try {
    const filename = path.basename(photo);
    const filePath = path.join(clinicUploadPath, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error("deleteClinicPhoto:", error);
  }
};

const deleteAllClinicPhotos = (clinicId) => {
  if (!fs.existsSync(clinicUploadPath)) return;

  try {
    const files = fs.readdirSync(clinicUploadPath);

    const prefix = `clinic_${clinicId}_`;

    for (const file of files) {
      if (!file.startsWith(prefix)) continue;

      try {
        fs.unlinkSync(path.join(clinicUploadPath, file));
      } catch (error) {
        console.error(`Impossible de supprimer la photo ${file}:`, error);
      }
    }
  } catch (error) {
    console.error("deleteAllClinicPhotos:", error);
  }
};

/* =========================================================
   GET ALL
========================================================= */

exports.getAll = async (userId) => {
  const doctor = await getDoctor(userId);

  const schedules = await repository.findDoctorClinics(doctor.id);

  const clinicMap = {};

  for (const row of schedules) {
    const clinic = row.Clinic;
    const clinicId = row.clinic_id;

    if (!clinicMap[clinicId]) {
      clinicMap[clinicId] = {
        clinic_id: clinic.id,
        name: clinic.name,
        address: clinic.address,
        phone: clinic.phone,

        wilaya: clinic.Wilaya?.name_fr ?? null,

        wilaya_code: clinic.Wilaya?.code ?? null,

        commune: clinic.Commune?.name_fr ?? null,

        is_private: clinic.is_private,

        is_own: clinic.created_by_doctor_id === doctor.id,

        latitude: fmtCoord(clinic.latitude),

        longitude: fmtCoord(clinic.longitude),

        photo: clinic.photo ?? null,

        schedule: [],
      };
    }

    clinicMap[clinicId].schedule.push({
      id: row.id,

      day: row.day_of_week,

      day_fr: DAYS_FR[row.day_of_week],

      start_time: fmtTime(row.start_time),

      end_time: fmtTime(row.end_time),
    });
  }

  const data = Object.values(clinicMap).map((clinic) => ({
    ...clinic,

    schedule: clinic.schedule.sort(
      (a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day),
    ),
  }));

  return {
    data,
    total: data.length,
  };
};

/* =========================================================
   GET AVAILABLE
========================================================= */

exports.getAvailable = async (userId, search) => {
  const doctor = await getDoctor(userId);

  const linkedIds = await repository.findLinkedClinicIds(doctor.id);

  const clinics = await repository.findAvailableClinics({
    doctorId: doctor.id,
    search,
  });

  return {
    data: clinics.map((clinic) => ({
      id: clinic.id,

      name: clinic.name,

      address: clinic.address,

      phone: clinic.phone,

      wilaya: clinic.Wilaya?.name_fr ?? null,

      wilaya_code: clinic.Wilaya?.code ?? null,

      commune: clinic.Commune?.name_fr ?? null,

      is_private: clinic.is_private,

      is_own: clinic.created_by_doctor_id === doctor.id,

      already_linked: linkedIds.includes(clinic.id),

      latitude: fmtCoord(clinic.latitude),

      longitude: fmtCoord(clinic.longitude),

      photo: clinic.photo ?? null,
    })),
  };
};

/* =========================================================
   CREATE CLINIC
========================================================= */

exports.createClinic = async (userId, data) => {
  const doctor = await getDoctor(userId);

  const { name, address, phone, wilaya_id, commune_id, latitude, longitude } =
    data;

  if (!name?.trim()) {
    const error = new Error("Le nom de la clinique est requis.");
    error.status = 400;
    throw error;
  }

  if (!address?.trim()) {
    const error = new Error("L'adresse est requise.");
    error.status = 400;
    throw error;
  }

  if (!wilaya_id) {
    const error = new Error("La wilaya est requise.");
    error.status = 400;
    throw error;
  }

  if (!commune_id) {
    const error = new Error("La commune est requise.");
    error.status = 400;
    throw error;
  }

  const clinic = await repository.createClinic({
    name: name.trim(),

    address: address.trim(),

    phone: phone?.trim() ?? null,

    wilaya_id,

    commune_id,

    is_private: true,

    created_by_doctor_id: doctor.id,

    latitude: fmtCoord(latitude),

    longitude: fmtCoord(longitude),

    photo: null,
  });

  await repository.createDoctorClinicLink({
    doctor_id: doctor.id,

    clinic_id: clinic.id,

    day_of_week: "Monday",

    start_time: "08:00",

    end_time: "17:00",
  });

  return {
    message: "Cabinet créé et ajouté à votre liste.",

    clinic: {
      clinic_id: clinic.id,

      name: clinic.name,

      address: clinic.address,

      phone: clinic.phone,

      is_private: true,

      is_own: true,

      latitude: fmtCoord(clinic.latitude),

      longitude: fmtCoord(clinic.longitude),

      photo: clinic.photo ?? null,
    },
  };
};

/* =========================================================
   UPDATE CLINIC
========================================================= */

exports.updateClinic = async (userId, clinicId, data) => {
  const doctor = await getDoctor(userId);

  const id = parseClinicId(clinicId);

  const clinic = await repository.findOwnPrivateClinic(id, doctor.id);

  if (!clinic) {
    const error = new Error("Cabinet introuvable ou non modifiable.");
    error.status = 404;
    throw error;
  }

  const { name, address, phone, latitude, longitude } = data;

  const updates = {};

  if (name?.trim()) {
    updates.name = name.trim();
  }

  if (address?.trim()) {
    updates.address = address.trim();
  }

  if (phone !== undefined) {
    updates.phone = phone?.trim() ?? null;
  }

  if (latitude !== undefined) {
    updates.latitude = fmtCoord(latitude);
  }

  if (longitude !== undefined) {
    updates.longitude = fmtCoord(longitude);
  }

  await repository.updateClinic(clinic, updates);

  return {
    message: "Cabinet mis à jour.",

    clinic: {
      id: clinic.id,

      name: clinic.name,

      address: clinic.address,

      phone: clinic.phone,

      latitude: fmtCoord(clinic.latitude),

      longitude: fmtCoord(clinic.longitude),

      photo: clinic.photo ?? null,
    },
  };
};

/* =========================================================
   UPDATE PHOTO
========================================================= */

exports.updatePhoto = async (userId, clinicId, file) => {
  let newPhotoPath = null;

  try {
    const doctor = await getDoctor(userId);

    const id = parseClinicId(clinicId);

    if (file) {
      newPhotoPath = `/uploads/clinics/${file.filename}`;
    }

    if (!file) {
      const error = new Error("Aucune image fournie.");
      error.status = 400;
      throw error;
    }

    const clinic = await repository.findOwnPrivateClinic(id, doctor.id);

    if (!clinic) {
      const error = new Error("Cabinet introuvable ou non modifiable.");
      error.status = 404;
      throw error;
    }

    const oldPhoto = clinic.photo;

    await repository.updateClinic(clinic, {
      photo: newPhotoPath,
    });

    if (oldPhoto && oldPhoto !== newPhotoPath) {
      deleteClinicPhoto(oldPhoto);
    }

    return {
      message: "Photo du cabinet mise à jour.",

      photo: newPhotoPath,
    };
  } catch (error) {
    if (newPhotoPath) {
      deleteClinicPhoto(newPhotoPath);
    }

    throw error;
  }
};

/* =========================================================
   ADD SCHEDULE
========================================================= */

exports.addSchedule = async (userId, clinicId, data) => {
  const doctor = await getDoctor(userId);

  const id = parseClinicId(clinicId);

  const { day_of_week, start_time, end_time } = data;

  if (!DAYS.includes(day_of_week)) {
    const error = new Error("Jour invalide.");
    error.status = 400;
    throw error;
  }

  if (!start_time || !end_time) {
    const error = new Error("Les horaires sont requis.");
    error.status = 400;
    throw error;
  }

  if (start_time >= end_time) {
    const error = new Error(
      "L'heure de fin doit être supérieure à l'heure de début.",
    );
    error.status = 400;
    throw error;
  }

  const clinic = await repository.findClinicById(id);

  if (!clinic) {
    const error = new Error("Cabinet introuvable.");
    error.status = 404;
    throw error;
  }

  const existingLink = await repository.findDoctorClinicLink(doctor.id, id);

  const isAllowed = clinic.created_by_doctor_id === doctor.id || !!existingLink;

  if (!isAllowed) {
    const error = new Error("Vous n'êtes pas autorisé à modifier ce cabinet.");
    error.status = 403;
    throw error;
  }

  const existing = await repository.findScheduleByDay({
    doctorId: doctor.id,
    clinicId: id,
    dayOfWeek: day_of_week,
  });

  if (existing) {
    const error = new Error("Un horaire existe déjà pour ce jour.");
    error.status = 409;
    throw error;
  }

  const schedule = await repository.createSchedule({
    doctor_id: doctor.id,

    clinic_id: id,

    day_of_week,

    start_time,

    end_time,
  });

  return {
    message: "Horaire ajouté.",

    schedule: {
      id: schedule.id,

      day: schedule.day_of_week,

      day_fr: DAYS_FR[schedule.day_of_week],

      start_time: fmtTime(schedule.start_time),

      end_time: fmtTime(schedule.end_time),
    },
  };
};



exports.updateSchedule = async (userId, scheduleId, data) => {
  const doctor = await getDoctor(userId);

  const id = parseScheduleId(scheduleId);

  const schedule = await repository.findScheduleByIdForDoctor(id, doctor.id);

  if (!schedule) {
    const error = new Error("Horaire introuvable.");
    error.status = 404;
    throw error;
  }

  const { day_of_week, start_time, end_time } = data;

  if (day_of_week && !DAYS.includes(day_of_week)) {
    const error = new Error("Jour invalide.");
    error.status = 400;
    throw error;
  }

  const newDay = day_of_week ?? schedule.day_of_week;

  const newStart = start_time ?? schedule.start_time;

  const newEnd = end_time ?? schedule.end_time;

  if (newStart >= newEnd) {
    const error = new Error(
      "L'heure de fin doit être supérieure à l'heure de début.",
    );
    error.status = 400;
    throw error;
  }

  const duplicate = await repository.findScheduleByDayExcept({
    doctorId: doctor.id,

    clinicId: schedule.clinic_id,

    dayOfWeek: newDay,

    scheduleId: schedule.id,
  });

  if (duplicate) {
    const error = new Error("Un horaire existe déjà pour ce jour.");
    error.status = 409;
    throw error;
  }

  await repository.updateSchedule(schedule, {
    day_of_week: newDay,
    start_time: newStart,
    end_time: newEnd,
  });

  return {
    message: "Horaire mis à jour.",

    schedule: {
      id: schedule.id,

      day: schedule.day_of_week,

      day_fr: DAYS_FR[schedule.day_of_week],

      start_time: fmtTime(schedule.start_time),

      end_time: fmtTime(schedule.end_time),
    },
  };
};

/*REMOVE SCHEDULE*/

exports.removeSchedule = async (userId, scheduleId) => {
  const doctor = await getDoctor(userId);

  const id = parseScheduleId(scheduleId);

  const schedule = await repository.findScheduleByIdForDoctor(id, doctor.id);

  if (!schedule) {
    const error = new Error("Horaire introuvable.");
    error.status = 404;
    throw error;
  }

  await repository.deleteSchedule(schedule);

  return {
    message: "Horaire supprimé.",
  };
};

/*  REMOVE CLINIC
*/

exports.removeClinic = async (userId, clinicId) => {
  const doctor = await getDoctor(userId);

  const id = parseClinicId(clinicId);

  const clinic = await repository.findClinicById(id);

  if (!clinic) {
    const error = new Error("Cabinet introuvable.");
    error.status = 404;
    throw error;
  }

  const isOwner =
    clinic.is_private && clinic.created_by_doctor_id === doctor.id;

  /*
   * Shared/public clinic:
   * only remove the doctor's link.
   */
  if (!isOwner) {
    const link = await repository.findDoctorClinicLink(doctor.id, id);

    if (!link) {
      const error = new Error("Ce cabinet n'est pas associé à votre profil.");
      error.status = 404;
      throw error;
    }

    await repository.deleteDoctorClinicLink(doctor.id, id);

    return {
      message: "Cabinet retiré de votre liste.",
    };
  }

  /*
   * Remove owner's relationship.
   */
  await repository.deleteDoctorClinicLink(doctor.id, id);

  const remainingDoctors = await repository.countClinicDoctors(id);

  /*
   * Nobody else uses the private clinic.
   */
  if (remainingDoctors === 0) {
    await repository.deleteClinic(clinic);

    deleteAllClinicPhotos(id);

    return {
      message: "Cabinet supprimé.",
    };
  }

  return {
    message: "Cabinet retiré de votre liste.",
  };
};
