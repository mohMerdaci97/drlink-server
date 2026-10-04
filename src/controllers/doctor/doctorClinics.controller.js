const {
  Doctor,
  DoctorClinic,
  Clinic,
  Wilaya,
  Commune,
} = require("../../models");

const { Op } = require("sequelize");
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
   Helpers
========================================================= */

async function getDoctor(userId) {
  const doctor = await Doctor.findOne({
    where: { user_id: userId },
  });

  if (!doctor) {
    throw {
      status: 404,
      message: "Profil médecin introuvable.",
    };
  }

  return doctor;
}

function fmtTime(t) {
  return t ? t.slice(0, 5) : null;
}

function fmtCoord(v) {
  return v != null ? parseFloat(v) : null;
}

/**
 * Delete a physical clinic photo.
 *
 * photo can be:
 * /uploads/clinics/clinic_15_123456.jpg
 */
function deleteClinicPhoto(photo) {
  if (!photo) return;

  try {
    const filename = path.basename(photo);
    const filePath = path.join(clinicUploadPath, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error("deleteClinicPhoto:", err);
  }
}

/**
 * Delete all physical photos belonging to a clinic.
 *
 * Useful when deleting the clinic itself.
 */
function deleteAllClinicPhotos(clinicId) {
  if (!fs.existsSync(clinicUploadPath)) return;

  try {
    const files = fs.readdirSync(clinicUploadPath);

    const prefix = `clinic_${clinicId}_`;

    for (const file of files) {
      if (file.startsWith(prefix)) {
        const filePath = path.join(clinicUploadPath, file);

        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error(`Impossible de supprimer la photo ${file}:`, err);
        }
      }
    }
  } catch (err) {
    console.error("deleteAllClinicPhotos:", err);
  }
}

/* =========================================================
   GET ALL DOCTOR CLINICS
========================================================= */

exports.getAll = async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.id);

    const schedules = await DoctorClinic.findAll({
      where: {
        doctor_id: doctor.id,
      },

      include: [
        {
          model: Clinic,

          attributes: [
            "id",
            "name",
            "address",
            "phone",
            "wilaya_id",
            "commune_id",
            "is_private",
            "created_by_doctor_id",
            "latitude",
            "longitude",
            "photo",
          ],

          include: [
            {
              model: Wilaya,
              as: "Wilaya",
              attributes: ["id", "name_fr", "code"],
            },

            {
              model: Commune,
              as: "Commune",
              attributes: ["id", "name_fr"],
            },
          ],
        },
      ],

      order: [["clinic_id", "ASC"]],
    });

    const clinicMap = {};

    for (const row of schedules) {
      const cid = row.clinic_id;

      if (!clinicMap[cid]) {
        clinicMap[cid] = {
          clinic_id: row.Clinic.id,

          name: row.Clinic.name,

          address: row.Clinic.address,

          phone: row.Clinic.phone,

          wilaya: row.Clinic.Wilaya?.name_fr ?? null,

          wilaya_code: row.Clinic.Wilaya?.code ?? null,

          commune: row.Clinic.Commune?.name_fr ?? null,

          is_private: row.Clinic.is_private,

          is_own: row.Clinic.created_by_doctor_id === doctor.id,

          latitude: fmtCoord(row.Clinic.latitude),

          longitude: fmtCoord(row.Clinic.longitude),

          photo: row.Clinic.photo ?? null,

          schedule: [],
        };
      }

      clinicMap[cid].schedule.push({
        id: row.id,

        day: row.day_of_week,

        day_fr: DAYS_FR[row.day_of_week],

        start_time: fmtTime(row.start_time),

        end_time: fmtTime(row.end_time),
      });
    }

    const result = Object.values(clinicMap).map((clinic) => ({
      ...clinic,

      schedule: clinic.schedule.sort(
        (a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day),
      ),
    }));

    res.json({
      data: result,
      total: result.length,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        message: err.message,
      });
    }

    console.error("doctorClinics.getAll:", err);

    res.status(500).json({
      message: "Erreur serveur.",
    });
  }
};

/* =========================================================
   GET AVAILABLE CLINICS
========================================================= */

exports.getAvailable = async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.id);

    const { search } = req.query;

    const linked = await DoctorClinic.findAll({
      where: {
        doctor_id: doctor.id,
      },

      attributes: ["clinic_id"],
    });

    const linkedIds = [...new Set(linked.map((r) => r.clinic_id))];

    const nameWhere = search?.trim()
      ? {
          name: {
            [Op.iLike]: `%${search.trim()}%`,
          },
        }
      : {};

    const clinics = await Clinic.findAll({
      where: {
        ...nameWhere,

        [Op.or]: [
          {
            is_private: false,
          },

          {
            is_private: true,

            created_by_doctor_id: doctor.id,
          },
        ],
      },

      attributes: [
        "id",
        "name",
        "address",
        "phone",
        "is_private",
        "created_by_doctor_id",
        "latitude",
        "longitude",
        "photo",
      ],

      include: [
        {
          model: Wilaya,
          as: "Wilaya",

          attributes: ["name_fr", "code"],
        },

        {
          model: Commune,
          as: "Commune",

          attributes: ["name_fr"],
        },
      ],

      order: [
        [
          Clinic.sequelize.literal(
            `CASE WHEN created_by_doctor_id = ${doctor.id} THEN 0 ELSE 1 END`,
          ),
          "ASC",
        ],

        ["name", "ASC"],
      ],

      limit: 30,
    });

    res.json({
      data: clinics.map((c) => ({
        id: c.id,

        name: c.name,

        address: c.address,

        phone: c.phone,

        wilaya: c.Wilaya?.name_fr ?? null,

        wilaya_code: c.Wilaya?.code ?? null,

        commune: c.Commune?.name_fr ?? null,

        is_private: c.is_private,

        is_own: c.created_by_doctor_id === doctor.id,

        already_linked: linkedIds.includes(c.id),

        latitude: fmtCoord(c.latitude),

        longitude: fmtCoord(c.longitude),

        photo: c.photo ?? null,
      })),
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        message: err.message,
      });
    }

    console.error("doctorClinics.getAvailable:", err);

    res.status(500).json({
      message: "Erreur serveur.",
    });
  }
};

/* =========================================================
   CREATE CLINIC
========================================================= */

exports.createClinic = async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.id);

    const { name, address, phone, wilaya_id, commune_id, latitude, longitude } =
      req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        message: "Le nom de la clinique est requis.",
      });
    }

    if (!address?.trim()) {
      return res.status(400).json({
        message: "L'adresse est requise.",
      });
    }

    if (!wilaya_id) {
      return res.status(400).json({
        message: "La wilaya est requise.",
      });
    }

    if (!commune_id) {
      return res.status(400).json({
        message: "La commune est requise.",
      });
    }

    const clinic = await Clinic.create({
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

    await DoctorClinic.create({
      doctor_id: doctor.id,

      clinic_id: clinic.id,

      day_of_week: "Monday",

      start_time: "08:00",

      end_time: "17:00",
    });

    res.status(201).json({
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
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        message: err.message,
      });
    }

    console.error("doctorClinics.createClinic:", err);

    res.status(500).json({
      message: "Erreur serveur.",
    });
  }
};

/* =========================================================
   UPDATE CLINIC INFORMATION
========================================================= */

exports.updateClinic = async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.id);

    const clinicId = parseInt(req.params.clinicId);

    if (Number.isNaN(clinicId)) {
      return res.status(400).json({
        message: "Identifiant du cabinet invalide.",
      });
    }

    const clinic = await Clinic.findOne({
      where: {
        id: clinicId,

        created_by_doctor_id: doctor.id,

        is_private: true,
      },
    });

    if (!clinic) {
      return res.status(404).json({
        message: "Cabinet introuvable ou non modifiable.",
      });
    }

    const { name, address, phone, latitude, longitude } = req.body;

    if (name?.trim()) {
      clinic.name = name.trim();
    }

    if (address?.trim()) {
      clinic.address = address.trim();
    }

    if (phone !== undefined) {
      clinic.phone = phone?.trim() ?? null;
    }

    if (latitude !== undefined) {
      clinic.latitude = fmtCoord(latitude);
    }

    if (longitude !== undefined) {
      clinic.longitude = fmtCoord(longitude);
    }

    await clinic.save();

    res.json({
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
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        message: err.message,
      });
    }

    console.error("doctorClinics.updateClinic:", err);

    res.status(500).json({
      message: "Erreur serveur.",
    });
  }
};

/* =========================================================
   UPDATE CLINIC PHOTO
========================================================= */

exports.updatePhoto = async (req, res) => {
  let newPhotoPath = null;

  try {
    const doctor = await getDoctor(req.user.id);

    const clinicId = parseInt(req.params.clinicId);

    if (Number.isNaN(clinicId)) {
      if (req.file) {
        deleteClinicPhoto(`/uploads/clinics/${req.file.filename}`);
      }

      return res.status(400).json({
        message: "Identifiant du cabinet invalide.",
      });
    }

    /*
     * Multer has already uploaded the file.
     * Keep track of it so we can delete it
     * if something fails.
     */
    if (req.file) {
      newPhotoPath = `/uploads/clinics/${req.file.filename}`;
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Aucune image fournie.",
      });
    }

    const clinic = await Clinic.findOne({
      where: {
        id: clinicId,

        created_by_doctor_id: doctor.id,

        is_private: true,
      },
    });

    if (!clinic) {
      deleteClinicPhoto(newPhotoPath);

      return res.status(404).json({
        message: "Cabinet introuvable ou non modifiable.",
      });
    }

    /*
     * Keep the old photo until the database
     * update succeeds.
     */
    const oldPhoto = clinic.photo;

    /*
     * Save the new photo path.
     */
    clinic.photo = newPhotoPath;

    await clinic.save();

    /*
     * Database update succeeded.
     * Now delete the old physical file.
     */
    if (oldPhoto && oldPhoto !== newPhotoPath) {
      deleteClinicPhoto(oldPhoto);
    }

    return res.json({
      message: "Photo du cabinet mise à jour.",

      photo: newPhotoPath,
    });
  } catch (err) {
    /*
     * Database update failed.
     * Delete only the newly uploaded file.
     * The old photo remains untouched.
     */
    if (newPhotoPath) {
      deleteClinicPhoto(newPhotoPath);
    }

    if (err.status) {
      return res.status(err.status).json({
        message: err.message,
      });
    }

    console.error("doctorClinics.updatePhoto:", err);

    return res.status(500).json({
      message: "Erreur serveur.",
    });
  }
};

/* =========================================================
   ADD SCHEDULE
========================================================= */

exports.addSchedule = async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.id);

    const clinicId = parseInt(req.params.clinicId);

    const { day_of_week, start_time, end_time } = req.body;

    if (!DAYS.includes(day_of_week)) {
      return res.status(400).json({
        message: "Jour invalide.",
      });
    }

    if (!start_time || !end_time) {
      return res.status(400).json({
        message: "Les horaires sont requis.",
      });
    }

    if (start_time >= end_time) {
      return res.status(400).json({
        message: "L'heure de fin doit être supérieure à l'heure de début.",
      });
    }

    const clinic = await Clinic.findOne({
      where: {
        id: clinicId,
      },
    });

    if (!clinic) {
      return res.status(404).json({
        message: "Cabinet introuvable.",
      });
    }

    /*
     * Verify that the doctor is allowed
     * to manage this clinic.
     */
    const existingLink = await DoctorClinic.findOne({
      where: {
        doctor_id: doctor.id,

        clinic_id: clinicId,
      },
    });

    if (clinic.created_by_doctor_id !== doctor.id && !existingLink) {
      return res.status(403).json({
        message: "Vous n'êtes pas autorisé à modifier ce cabinet.",
      });
    }

    const existing = await DoctorClinic.findOne({
      where: {
        doctor_id: doctor.id,

        clinic_id: clinicId,

        day_of_week,
      },
    });

    if (existing) {
      return res.status(409).json({
        message: "Un horaire existe déjà pour ce jour.",
      });
    }

    const schedule = await DoctorClinic.create({
      doctor_id: doctor.id,

      clinic_id: clinicId,

      day_of_week,

      start_time,

      end_time,
    });

    res.status(201).json({
      message: "Horaire ajouté.",

      schedule: {
        id: schedule.id,

        day: schedule.day_of_week,

        day_fr: DAYS_FR[schedule.day_of_week],

        start_time: fmtTime(schedule.start_time),

        end_time: fmtTime(schedule.end_time),
      },
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        message: err.message,
      });
    }

    console.error("doctorClinics.addSchedule:", err);

    res.status(500).json({
      message: "Erreur serveur.",
    });
  }
};

/* =========================================================
   UPDATE SCHEDULE
========================================================= */

exports.updateSchedule = async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.id);

    const scheduleId = parseInt(req.params.scheduleId);

    const { day_of_week, start_time, end_time } = req.body;

    const schedule = await DoctorClinic.findOne({
      where: {
        id: scheduleId,

        doctor_id: doctor.id,
      },
    });

    if (!schedule) {
      return res.status(404).json({
        message: "Horaire introuvable.",
      });
    }

    if (day_of_week && !DAYS.includes(day_of_week)) {
      return res.status(400).json({
        message: "Jour invalide.",
      });
    }

    const newDay = day_of_week ?? schedule.day_of_week;

    const newStart = start_time ?? schedule.start_time;

    const newEnd = end_time ?? schedule.end_time;

    if (newStart >= newEnd) {
      return res.status(400).json({
        message: "L'heure de fin doit être supérieure à l'heure de début.",
      });
    }

    /*
     * Check duplicate day.
     */
    const duplicate = await DoctorClinic.findOne({
      where: {
        doctor_id: doctor.id,

        clinic_id: schedule.clinic_id,

        day_of_week: newDay,

        id: {
          [Op.ne]: schedule.id,
        },
      },
    });

    if (duplicate) {
      return res.status(409).json({
        message: "Un horaire existe déjà pour ce jour.",
      });
    }

    schedule.day_of_week = newDay;

    schedule.start_time = newStart;

    schedule.end_time = newEnd;

    await schedule.save();

    res.json({
      message: "Horaire mis à jour.",

      schedule: {
        id: schedule.id,

        day: schedule.day_of_week,

        day_fr: DAYS_FR[schedule.day_of_week],

        start_time: fmtTime(schedule.start_time),

        end_time: fmtTime(schedule.end_time),
      },
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        message: err.message,
      });
    }

    console.error("doctorClinics.updateSchedule:", err);

    res.status(500).json({
      message: "Erreur serveur.",
    });
  }
};

/* =========================================================
   REMOVE SCHEDULE
========================================================= */

exports.removeSchedule = async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.id);

    const scheduleId = parseInt(req.params.scheduleId);

    const schedule = await DoctorClinic.findOne({
      where: {
        id: scheduleId,

        doctor_id: doctor.id,
      },
    });

    if (!schedule) {
      return res.status(404).json({
        message: "Horaire introuvable.",
      });
    }

    await schedule.destroy();

    res.json({
      message: "Horaire supprimé.",
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        message: err.message,
      });
    }

    console.error("doctorClinics.removeSchedule:", err);

    res.status(500).json({
      message: "Erreur serveur.",
    });
  }
};

/* =========================================================
   REMOVE CLINIC
========================================================= */

exports.removeClinic = async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.id);

    const clinicId = parseInt(req.params.clinicId);

    if (Number.isNaN(clinicId)) {
      return res.status(400).json({
        message: "Identifiant du cabinet invalide.",
      });
    }

    const clinic = await Clinic.findOne({
      where: {
        id: clinicId,
      },
    });

    if (!clinic) {
      return res.status(404).json({
        message: "Cabinet introuvable.",
      });
    }

    /*
     * Only the doctor who owns a private
     * cabinet can delete the cabinet itself.
     */
    const isOwner =
      clinic.is_private && clinic.created_by_doctor_id === doctor.id;

    if (!isOwner) {
      /*
       * For shared/public clinics, the doctor
       * only removes his relationship.
       */
      const link = await DoctorClinic.findOne({
        where: {
          doctor_id: doctor.id,

          clinic_id: clinicId,
        },
      });

      if (!link) {
        return res.status(404).json({
          message: "Ce cabinet n'est pas associé à votre profil.",
        });
      }

      await link.destroy();

      return res.json({
        message: "Cabinet retiré de votre liste.",
      });
    }

    /*
     * Remove this doctor's relationship.
     */
    await DoctorClinic.destroy({
      where: {
        doctor_id: doctor.id,

        clinic_id: clinicId,
      },
    });

    /*
     * Check if another doctor is still
     * associated with this private clinic.
     */
    const remainingDoctors = await DoctorClinic.count({
      where: {
        clinic_id: clinicId,
      },
    });

    /*
     * If nobody else uses the private clinic,
     * delete the clinic itself.
     */
    if (remainingDoctors === 0) {
      await clinic.destroy();

      /*
       * Delete physical image files
       * after successful DB deletion.
       */
      deleteAllClinicPhotos(clinicId);

      return res.json({
        message: "Cabinet supprimé.",
      });
    }

    res.json({
      message: "Cabinet retiré de votre liste.",
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        message: err.message,
      });
    }

    console.error("doctorClinics.removeClinic:", err);

    res.status(500).json({
      message: "Erreur serveur.",
    });
  }
};
