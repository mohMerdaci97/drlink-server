const { Op } = require("sequelize");
const {
  User,
  Patient,
  Assistant,
  Appointment,
  DoctorPatient,
  Doctor,
  Clinic,
  DoctorClinic,
} = require("../../models");
const { getPagination, getPagingData } = require("../../helpers/pagination");

// GET ASSISTANT (helper)
const getAssistant = async (userId) => {
  return Assistant.findOne({ where: { user_id: userId } });
};
// helper: generate slots,
function _generateSlots(startTime, endTime, intervalMinutes) {
  const slots = [];
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);

  let currentMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  while (currentMinutes + intervalMinutes <= endMinutes) {
    const h = Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    currentMinutes += intervalMinutes;
  }

  return slots;
}

// AVAILABLE SLOTS — for the booking flow, scoped to the assistant's doctor
exports.getAvailableSlots = async (req, res) => {
  try {
    const assistant = await getAssistant(req.user.id);
    if (!assistant)
      return res.status(404).json({ message: "Assistant introuvable." });

    const { clinic_id, date } = req.query;
    if (!clinic_id || !date) {
      return res.status(400).json({ message: "clinic_id et date requis." });
    }

    const doctor = await Doctor.findByPk(assistant.doctor_id, {
      attributes: ["id", "slot_duration"],
    });
    if (!doctor)
      return res.status(404).json({ message: "Médecin introuvable." });

    const duration = doctor.slot_duration || 30;

    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayOfWeek = days[new Date(date).getDay()];

    const schedule = await DoctorClinic.findOne({
      where: {
        doctor_id: assistant.doctor_id,
        clinic_id,
        day_of_week: dayOfWeek,
      },
    });

    if (!schedule) {
      return res.json({ slots: [], available: false, reason: "no_schedule" });
    }

    const allSlots = _generateSlots(
      schedule.start_time,
      schedule.end_time,
      duration,
    );

    const booked = await Appointment.findAll({
      where: {
        doctor_id: assistant.doctor_id,
        clinic_id,
        appointment_date: date,
        status: { [Op.in]: ["pending", "confirmed"] },
      },
      attributes: ["appointment_time"],
    });

    const bookedTimes = new Set(
      booked.map((a) => a.appointment_time.substring(0, 5)),
    );

    const slots = allSlots.map((time) => ({
      time,
      available: !bookedTimes.has(time),
    }));

    res.json({
      date,
      day_of_week: dayOfWeek,
      slot_duration: duration,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      slots,
    });
  } catch (err) {
    console.error("getAvailableSlots:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};
// CREATE PATIENT (walk-in, created by an assistant on behalf of their doctor)
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
          as: "user",
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
          as: "doctorPatients",
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
          as: "user",
          attributes: ["id", "full_name", "phone", "created_at"],
        },
        {
          model: DoctorPatient,
          as: "doctorPatients",
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
          as: "user",
          attributes: ["id", "full_name", "phone"],
        },
        {
          model: Appointment,

          include: [
            {
              model: Doctor,
              include: [
                { model: User, as: "user", attributes: ["id", "full_name"] },
              ],
            },
            { model: Clinic },
          ],
          limit: 10,
          order: [["appointment_date", "DESC"]],
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
      include: [{ model: User, as: "user" }],
    });

    if (!patient)
      return res.status(404).json({ message: "Patient introuvable." });

    const { full_name, phone, gender, date_of_birth } = req.body;

    if (full_name) patient.user.full_name = full_name.trim();
    if (phone) patient.user.phone = phone.trim();
    if (gender) patient.gender = gender;
    if (date_of_birth) patient.date_of_birth = date_of_birth;

    await patient.user.save();
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
// Deletes only the doctor_patients link — never the underlying User/Patient
// identity, since they may belong to other doctors or be a self-registered
// app user. This is a "remove from my list", not "delete this person".
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

// ----------------------------------------------------------------------
// Extra endpoints that make an assistant's dashboard actually useful day
// to day, not just CRUD. All scoped to assistant.doctor_id the same way.
// ----------------------------------------------------------------------

// DASHBOARD SUMMARY — quick numbers for the assistant's home screen
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
          // No "as": Appointment.belongsTo(Patient) has no explicit alias.
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "full_name", "phone"],
            },
          ],
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

// BOOK APPOINTMENT FOR AN EXISTING PATIENT
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
      status: "confirmed",
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

// RECENTLY ADDED PATIENTS
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
          as: "patient",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "full_name", "phone"],
            },
          ],
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

// GET MY DOCTOR'S CLINICS
exports.getMyClinics = async (req, res) => {
  try {
    const assistant = await getAssistant(req.user.id);
    if (!assistant)
      return res.status(404).json({ message: "Assistant introuvable." });

    const doctor = await Doctor.findByPk(assistant.doctor_id, {
      include: [
        { model: Clinic, as: "Clinics", attributes: ["id", "name", "address"] },
      ],
    });

    res.json(doctor?.Clinics || []);
  } catch (err) {
    console.error("getMyClinics:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};
