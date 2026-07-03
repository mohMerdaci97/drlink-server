const { Op } = require("sequelize");
const {
  User,
  Patient,
  Assistant,
  Appointment,
  DoctorPatient,
} = require("../../models");
const { getPagination, getPagingData } = require("../../helpers/pagination");

// GET ASSISTANT (helper)
const getAssistant = async (userId) => {
  return Assistant.findOne({ where: { user_id: userId } });
};

// CREATE PATIENT (walk-in)
exports.createPatient = async (req, res) => {
  try {
    const assistant = await getAssistant(req.user.id);
    if (!assistant)
      return res.status(404).json({ message: "Assistant introuvable." });

    const { full_name, phone, gender, date_of_birth } = req.body;

    if (!full_name?.trim() || !phone?.trim()) {
      return res.status(400).json({ message: "Nom et téléphone requis." });
    }

    const cleanPhone = phone.trim();

    let user = await User.findOne({ where: { phone: cleanPhone } });

    if (user) {
      // Someone already owns this phone with a real, usable account.
      // Don't silently reuse it here — that's an identity decision, not ours to make.
      if (user.password_hash) {
        return res.status(409).json({
          message:
            "Un compte existe déjà avec ce numéro. Demandez au patient de se connecter via l'application.",
        });
      }
    } else {
      user = await User.create({
        full_name: full_name.trim(),
        phone: cleanPhone,
        role: "patient",
        is_active: true,
        // password_hash left null: this account can't log in until claimed
      });
    }

    let patient = await Patient.findOne({ where: { user_id: user.id } });

    if (!patient) {
      patient = await Patient.create({
        user_id: user.id,
        gender: gender || null,
        date_of_birth: date_of_birth || null,
      });
    }

    // Link this patient to the assistant's doctor (idempotent).
    await DoctorPatient.findOrCreate({
      where: {
        doctor_id: assistant.doctor_id,
        patient_id: patient.id,
      },
      defaults: {
        source: "walk_in",
        added_by_user_id: req.user.id,
      },
    });

    return res.status(201).json({
      message: "Patient créé avec succès.",
      patient,
    });
  } catch (err) {
    console.error("createPatient:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// SEARCH PATIENTS — only among patients linked to this assistant's doctor
exports.searchPatients = async (req, res) => {
  try {
    const assistant = await getAssistant(req.user.id);
    if (!assistant)
      return res.status(404).json({ message: "Assistant introuvable." });

    const { q } = req.query;

    if (!q?.trim()) {
      return res.status(400).json({ message: "Query requise." });
    }

    const patients = await Patient.findAll({
      include: [
        {
          model: User,
          where: {
            [Op.or]: [
              { full_name: { [Op.iLike]: `%${q.trim()}%` } },
              { phone: { [Op.like]: `%${q.trim()}%` } },
            ],
          },
          attributes: ["id", "full_name", "phone"],
        },
        {
          model: DoctorPatient,
          where: { doctor_id: assistant.doctor_id },
          attributes: [],
          required: true,
        },
      ],
      limit: 20,
    });

    res.json(patients);
  } catch (err) {
    console.error("searchPatients:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// GET ALL PATIENTS — only ones linked to this assistant's doctor
exports.getPatients = async (req, res) => {
  try {
    const assistant = await getAssistant(req.user.id);
    if (!assistant)
      return res.status(404).json({ message: "Assistant introuvable." });

    const { page, limit, offset } = getPagination(req.query);

    const result = await Patient.findAndCountAll({
      include: [
        {
          model: User,
          attributes: ["id", "full_name", "phone", "created_at"],
        },
        {
          model: DoctorPatient,
          where: { doctor_id: assistant.doctor_id },
          attributes: ["source", "created_at"],
          required: true,
        },
      ],
      distinct: true,
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    res.json(getPagingData(result, page, limit));
  } catch (err) {
    console.error("getPatients:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// GET SINGLE PATIENT DETAILS — only if linked to this assistant's doctor
exports.getPatient = async (req, res) => {
  try {
    const assistant = await getAssistant(req.user.id);
    if (!assistant)
      return res.status(404).json({ message: "Assistant introuvable." });

    const link = await DoctorPatient.findOne({
      where: { doctor_id: assistant.doctor_id, patient_id: req.params.id },
    });
    if (!link) return res.status(404).json({ message: "Patient introuvable." });

    const patient = await Patient.findByPk(req.params.id, {
      include: [
        {
          model: User,
          attributes: ["id", "full_name", "phone"],
        },
        {
          model: Appointment,
          include: ["doctor", "clinic"],
          limit: 10,
          order: [["created_at", "DESC"]],
        },
      ],
    });

    if (!patient)
      return res.status(404).json({ message: "Patient introuvable." });

    res.json(patient);
  } catch (err) {
    console.error("getPatient:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// UPDATE PATIENT — only if linked to this assistant's doctor
exports.updatePatient = async (req, res) => {
  try {
    const assistant = await getAssistant(req.user.id);
    if (!assistant)
      return res.status(404).json({ message: "Assistant introuvable." });

    const link = await DoctorPatient.findOne({
      where: { doctor_id: assistant.doctor_id, patient_id: req.params.id },
    });
    if (!link) return res.status(404).json({ message: "Patient introuvable." });

    const patient = await Patient.findByPk(req.params.id, {
      include: [User],
    });

    if (!patient)
      return res.status(404).json({ message: "Patient introuvable." });

    const { full_name, phone, gender, date_of_birth } = req.body;

    if (full_name) patient.User.full_name = full_name.trim();
    if (phone) patient.User.phone = phone.trim();
    if (gender) patient.gender = gender;
    if (date_of_birth) patient.date_of_birth = date_of_birth;

    await patient.User.save();
    await patient.save();

    res.json({
      message: "Patient mis à jour avec succès.",
      patient,
    });
  } catch (err) {
    console.error("updatePatient:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// REMOVE PATIENT FROM THIS DOCTOR'S LIST

exports.removePatientFromMyList = async (req, res) => {
  try {
    const assistant = await getAssistant(req.user.id);
    if (!assistant)
      return res.status(404).json({ message: "Assistant introuvable." });

    const link = await DoctorPatient.findOne({
      where: { doctor_id: assistant.doctor_id, patient_id: req.params.id },
    });
    if (!link) return res.status(404).json({ message: "Patient introuvable." });

    await link.destroy();

    res.json({ message: "Patient retiré de la liste." });
  } catch (err) {
    console.error("removePatientFromMyList:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};


exports.getDashboardSummary = async (req, res) => {
  try {
    const assistant = await getAssistant(req.user.id);
    if (!assistant)
      return res.status(404).json({ message: "Assistant introuvable." });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [totalPatients, todaysAppointments, pendingAppointments] =
      await Promise.all([
        DoctorPatient.count({ where: { doctor_id: assistant.doctor_id } }),
        Appointment.count({
          where: {
            doctor_id: assistant.doctor_id,
            appointment_date: { [Op.between]: [todayStart, todayEnd] },
          },
        }),
        Appointment.count({
          where: {
            doctor_id: assistant.doctor_id,
            status: "pending",
          },
        }),
      ]);

    res.json({ totalPatients, todaysAppointments, pendingAppointments });
  } catch (err) {
    console.error("getDashboardSummary:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// TODAY'S SCHEDULE — the list an assistant checks first thing
exports.getTodaysAppointments = async (req, res) => {
  try {
    const assistant = await getAssistant(req.user.id);
    if (!assistant)
      return res.status(404).json({ message: "Assistant introuvable." });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const appointments = await Appointment.findAll({
      where: {
        doctor_id: assistant.doctor_id,
        appointment_date: { [Op.between]: [todayStart, todayEnd] },
      },
      include: [
        {
          model: Patient,
          include: [{ model: User, attributes: ["id", "full_name", "phone"] }],
        },
      ],
      order: [["appointment_time", "ASC"]],
    });

    res.json(appointments);
  } catch (err) {
    console.error("getTodaysAppointments:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// BOOK APPOINTMENT FOR AN EXISTING PATIENT (assistant acting on their behalf)
// Also (re)links the patient to this doctor if that link doesn't exist yet —
// e.g. an app-registered patient calling in to book with a new doctor.
exports.bookAppointmentForPatient = async (req, res) => {
  try {
    const assistant = await getAssistant(req.user.id);
    if (!assistant)
      return res.status(404).json({ message: "Assistant introuvable." });

    const { patient_id, clinic_id, appointment_date, appointment_time } =
      req.body;

    if (!patient_id || !appointment_date || !appointment_time) {
      return res.status(400).json({
        message: "Patient, date et heure du rendez-vous requis.",
      });
    }

    const patient = await Patient.findByPk(patient_id);
    if (!patient)
      return res.status(404).json({ message: "Patient introuvable." });

    await DoctorPatient.findOrCreate({
      where: { doctor_id: assistant.doctor_id, patient_id: patient.id },
      defaults: { source: "walk_in", added_by_user_id: req.user.id },
    });

    const appointment = await Appointment.create({
      patient_id: patient.id,
      doctor_id: assistant.doctor_id,
      clinic_id: clinic_id || null,
      appointment_date,
      appointment_time,
      status: "confirmed", // assistant-booked appointments can skip the pending step
    });

    res.status(201).json({
      message: "Rendez-vous créé avec succès.",
      appointment,
    });
  } catch (err) {
    console.error("bookAppointmentForPatient:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// RECENTLY ADDED PATIENTS — useful for "did I already add this walk-in"
// and for a doctor reviewing what their assistant has been doing
exports.getRecentlyAddedPatients = async (req, res) => {
  try {
    const assistant = await getAssistant(req.user.id);
    if (!assistant)
      return res.status(404).json({ message: "Assistant introuvable." });

    const links = await DoctorPatient.findAll({
      where: {
        doctor_id: assistant.doctor_id,
        source: "walk_in",
      },
      include: [
        {
          model: Patient,
          include: [{ model: User, attributes: ["id", "full_name", "phone"] }],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: 20,
    });

    res.json(links);
  } catch (err) {
    console.error("getRecentlyAddedPatients:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};
