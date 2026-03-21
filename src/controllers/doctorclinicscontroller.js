const { Doctor, DoctorClinic, Clinic, Wilaya, Commune } = require("../models");
const { Op } = require("sequelize");

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

async function getDoctor(userId) {
  const doctor = await Doctor.findOne({ where: { user_id: userId } });
  if (!doctor) throw { status: 404, message: "Profil médecin introuvable." };
  return doctor;
}

function fmtTime(t) {
  return t ? t.slice(0, 5) : null;
}

// ── GET /api/doctor/clinics
exports.getAll = async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.id);

    const schedules = await DoctorClinic.findAll({
      where: { doctor_id: doctor.id },
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
          ],
          include: [
            {
              model: Wilaya,
              as: "Wilaya",
              attributes: ["id", "name_fr", "code"],
            },
            { model: Commune, as: "Commune", attributes: ["id", "name_fr"] },
          ],
        },
      ],
      order: [["clinic_id", "ASC"]],
    });

    // Group by clinic
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

    const result = Object.values(clinicMap).map((c) => ({
      ...c,
      schedule: c.schedule.sort(
        (a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day),
      ),
    }));

    res.json({ data: result, total: result.length });
  } catch (err) {
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    console.error("doctorClinics.getAll:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// ── GET /api/doctor/clinics/available ────────────────────────────────────────
// Public clinics (admin-created) + doctor's own private clinics — NOT other doctors' private clinics
exports.getAvailable = async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.id);
    const { search } = req.query;

    const linked = await DoctorClinic.findAll({
      where: { doctor_id: doctor.id },
      attributes: ["clinic_id"],
    });
    const linkedIds = [...new Set(linked.map((r) => r.clinic_id))];

    const nameWhere = search?.trim()
      ? { name: { [Op.iLike]: `%${search.trim()}%` } }
      : {};

    const clinics = await Clinic.findAll({
      where: {
        ...nameWhere,
        // Show: public clinics (is_private=false) OR this doctor's own private clinics
        [Op.or]: [
          { is_private: false },
          { is_private: true, created_by_doctor_id: doctor.id },
        ],
      },
      attributes: [
        "id",
        "name",
        "address",
        "phone",
        "is_private",
        "created_by_doctor_id",
      ],
      include: [
        { model: Wilaya, as: "Wilaya", attributes: ["name_fr", "code"] },
        { model: Commune, as: "Commune", attributes: ["name_fr"] },
      ],
      order: [
        // Own clinics first
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
      })),
    });
  } catch (err) {
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    console.error("doctorClinics.getAvailable:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// ── POST /api/doctor/clinics ──────────────────────────────────────────────────
// Doctor creates their own private cabinet then immediately links it
exports.createClinic = async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.id);
    const { name, address, phone, wilaya_id, commune_id } = req.body;

    if (!name?.trim())
      return res
        .status(400)
        .json({ message: "Le nom de la clinique est requis." });
    if (!address?.trim())
      return res.status(400).json({ message: "L'adresse est requise." });
    if (!wilaya_id)
      return res.status(400).json({ message: "La wilaya est requise." });
    if (!commune_id)
      return res.status(400).json({ message: "La commune est requise." });

    const clinic = await Clinic.create({
      name: name.trim(),
      address: address.trim(),
      phone: phone?.trim() ?? null,
      wilaya_id,
      commune_id,
      is_private: true,
      created_by_doctor_id: doctor.id,
    });

    // Auto-link with a default Monday slot so it shows in the list
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
      },
    });
  } catch (err) {
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    console.error("doctorClinics.createClinic:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// Doctor can edit ONLY their own private clinic info
exports.updateClinic = async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.id);
    const clinicId = parseInt(req.params.clinicId);

    const clinic = await Clinic.findOne({
      where: {
        id: clinicId,
        created_by_doctor_id: doctor.id,
        is_private: true,
      },
    });
    if (!clinic)
      return res
        .status(404)
        .json({ message: "Cabinet introuvable ou non modifiable." });

    const { name, address, phone } = req.body;
    if (name?.trim()) clinic.name = name.trim();
    if (address?.trim()) clinic.address = address.trim();
    clinic.phone = phone?.trim() ?? clinic.phone;
    await clinic.save();

    res.json({
      message: "Cabinet mis à jour.",
      clinic: {
        id: clinic.id,
        name: clinic.name,
        address: clinic.address,
        phone: clinic.phone,
      },
    });
  } catch (err) {
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// ── POST /api/doctor/clinics/:clinicId/schedule
exports.addSchedule = async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.id);
    const clinicId = parseInt(req.params.clinicId);
    const { day_of_week, start_time, end_time } = req.body;

    if (!DAYS.includes(day_of_week))
      return res.status(400).json({ message: "Jour invalide." });
    if (!start_time || !end_time)
      return res.status(400).json({ message: "Heures requises." });
    if (start_time >= end_time)
      return res
        .status(400)
        .json({ message: "L'heure de fin doit être après le début." });

    // Verify clinic is visible to this doctor (public or own private)
    const clinic = await Clinic.findOne({
      where: {
        id: clinicId,
        [Op.or]: [{ is_private: false }, { created_by_doctor_id: doctor.id }],
      },
    });
    if (!clinic)
      return res.status(404).json({ message: "Clinique introuvable." });

    const [row, created] = await DoctorClinic.findOrCreate({
      where: { doctor_id: doctor.id, clinic_id: clinicId, day_of_week },
      defaults: { start_time, end_time },
    });
    if (!created) await row.update({ start_time, end_time });

    res.status(created ? 201 : 200).json({
      message: created ? "Horaire ajouté." : "Horaire mis à jour.",
      schedule: {
        id: row.id,
        day: row.day_of_week,
        day_fr: DAYS_FR[row.day_of_week],
        start_time: fmtTime(row.start_time),
        end_time: fmtTime(row.end_time),
      },
    });
  } catch (err) {
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    console.error("doctorClinics.addSchedule:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// ── PATCH /api/doctor/clinics/schedule/:scheduleId ───────────────────────────
exports.updateSchedule = async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.id);
    const { start_time, end_time } = req.body;
    if (!start_time || !end_time)
      return res.status(400).json({ message: "Heures requises." });
    if (start_time >= end_time)
      return res
        .status(400)
        .json({ message: "L'heure de fin doit être après le début." });

    const row = await DoctorClinic.findOne({
      where: { id: req.params.scheduleId, doctor_id: doctor.id },
    });
    if (!row) return res.status(404).json({ message: "Horaire introuvable." });

    await row.update({ start_time, end_time });
    res.json({
      message: "Horaire mis à jour.",
      schedule: {
        id: row.id,
        day: row.day_of_week,
        day_fr: DAYS_FR[row.day_of_week],
        start_time: fmtTime(row.start_time),
        end_time: fmtTime(row.end_time),
      },
    });
  } catch (err) {
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// ── DELETE /api/doctor/clinics/schedule/:scheduleId ──────────────────────────
exports.removeSchedule = async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.id);
    const row = await DoctorClinic.findOne({
      where: { id: req.params.scheduleId, doctor_id: doctor.id },
    });
    if (!row) return res.status(404).json({ message: "Horaire introuvable." });
    await row.destroy();
    res.json({ message: "Horaire supprimé." });
  } catch (err) {
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// ── DELETE /api/doctor/clinics/:clinicId ─────────────────────────────────────
// Unlink + if it was the doctor's own private clinic → delete the clinic too
exports.removeClinic = async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.id);
    const clinicId = parseInt(req.params.clinicId);

    const deleted = await DoctorClinic.destroy({
      where: { doctor_id: doctor.id, clinic_id: clinicId },
    });
    if (!deleted)
      return res
        .status(404)
        .json({ message: "Clinique non trouvée dans votre liste." });

    // If it was their own private cabinet with no other doctors → delete the clinic record too
    const clinic = await Clinic.findOne({
      where: {
        id: clinicId,
        created_by_doctor_id: doctor.id,
        is_private: true,
      },
    });
    if (clinic) {
      const otherLinks = await DoctorClinic.count({
        where: { clinic_id: clinicId },
      });
      if (otherLinks === 0) await clinic.destroy();
    }

    res.json({ message: "Clinique retirée de votre liste." });
  } catch (err) {
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    res.status(500).json({ message: "Erreur serveur." });
  }
};
