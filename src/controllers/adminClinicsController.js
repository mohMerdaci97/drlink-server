const {
  Clinic,
  Wilaya,
  Commune,
  DoctorClinic,
  Doctor,
  User,
  Appointment,
} = require("../models");
const { Op, fn, col } = require("sequelize");
// ── GET /api/admin/clinics
exports.getAll = async (req, res) => {
  try {
    const { search, wilaya_id } = req.query;
    const where = {};
    if (search?.trim()) where.name = { [Op.iLike]: `%${search.trim()}%` };
    if (wilaya_id) where.wilaya_id = wilaya_id;

    const clinics = await Clinic.findAll({
      where,
      attributes: [
        "id",
        "name",
        "address",
        "phone",
        "wilaya_id",
        "commune_id",
        "is_private",
        "created_by_doctor_id",
        "created_at",
        "latitude",
        "longitude",
      ],
      include: [
        { model: Wilaya, as: "Wilaya", attributes: ["id", "name_fr", "code"] },
        { model: Commune, as: "Commune", attributes: ["id", "name_fr"] },
      ],
      order: [
        ["is_private", "ASC"],
        ["name", "ASC"],
      ],
    });

    // Attach doctor + appointment counts
    const ids = clinics.map((c) => c.id);

    const [dcRows, apRows] = await Promise.all([
      DoctorClinic.findAll({
        where: { clinic_id: { [Op.in]: ids } },
        attributes: [
          "clinic_id",
          [fn("COUNT", fn("DISTINCT", col("doctor_id"))), "doctor_count"],
        ],
        group: ["clinic_id"],
        raw: true,
      }),
      Appointment.findAll({
        where: { clinic_id: { [Op.in]: ids } },
        attributes: ["clinic_id", [fn("COUNT", col("id")), "appt_count"]],
        group: ["clinic_id"],
        raw: true,
      }),
    ]);

    const dcMap = {};
    dcRows.forEach((r) => {
      dcMap[r.clinic_id] = parseInt(r.doctor_count);
    });
    const apMap = {};
    apRows.forEach((r) => {
      apMap[r.clinic_id] = parseInt(r.appt_count);
    });

    res.json({
      data: clinics.map((c) => ({
        id: c.id,
        name: c.name,
        address: c.address,
        phone: c.phone,
        wilaya_id: c.wilaya_id,
        commune_id: c.commune_id,
        wilaya: c.Wilaya?.name_fr ?? null,
        wilaya_code: c.Wilaya?.code ?? null,
        commune: c.Commune?.name_fr ?? null,
        is_private: c.is_private,
        created_by_doctor_id: c.created_by_doctor_id,
        created_at: c.created_at,
        latitude: c.latitude != null ? parseFloat(c.latitude) : null,
        longitude: c.longitude != null ? parseFloat(c.longitude) : null,
        doctor_count: dcMap[c.id] ?? 0,
        appt_count: apMap[c.id] ?? 0,
      })),
      total: clinics.length,
    });
  } catch (err) {
    console.error("adminClinics.getAll:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// ── GET /api/admin/clinics/:id ────────────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const clinic = await Clinic.findByPk(req.params.id, {
      include: [
        { model: Wilaya, as: "Wilaya", attributes: ["id", "name_fr", "code"] },
        { model: Commune, as: "Commune", attributes: ["id", "name_fr"] },
      ],
    });
    if (!clinic)
      return res.status(404).json({ message: "Clinique introuvable." });

    const schedules = await DoctorClinic.findAll({
      where: { clinic_id: clinic.id },
      include: [
        {
          model: Doctor,
          include: [
            { model: User, attributes: ["full_name", "phone", "email"] },
          ],
        },
      ],
      order: [["doctor_id", "ASC"]],
    });

    const doctorMap = {};
    for (const row of schedules) {
      const did = row.doctor_id;
      if (!doctorMap[did]) {
        doctorMap[did] = {
          doctor_id: did,
          full_name: row.Doctor?.User?.full_name ?? "—",
          phone: row.Doctor?.User?.phone ?? null,
          email: row.Doctor?.User?.email ?? null,
          schedule: [],
        };
      }
      doctorMap[did].schedule.push({
        day: row.day_of_week,
        start_time: row.start_time?.slice(0, 5),
        end_time: row.end_time?.slice(0, 5),
      });
    }

    res.json({
      clinic: {
        id: clinic.id,
        name: clinic.name,
        address: clinic.address,
        phone: clinic.phone,
        wilaya_id: clinic.wilaya_id,
        commune_id: clinic.commune_id,
        wilaya: clinic.Wilaya?.name_fr ?? null,
        commune: clinic.Commune?.name_fr ?? null,
        is_private: clinic.is_private,
        created_at: clinic.created_at,
        latitude: clinic.latitude != null ? parseFloat(clinic.latitude) : null,
        longitude:
          clinic.longitude != null ? parseFloat(clinic.longitude) : null,
      },
      doctors: Object.values(doctorMap),
    });
  } catch (err) {
    console.error("adminClinics.getOne:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// ── POST /api/admin/clinics ───────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { name, address, phone, wilaya_id, commune_id, latitude, longitude } =
      req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Nom requis." });
    if (!address?.trim())
      return res.status(400).json({ message: "Adresse requise." });
    if (!wilaya_id) return res.status(400).json({ message: "Wilaya requise." });
    if (!commune_id)
      return res.status(400).json({ message: "Commune requise." });

    const clinic = await Clinic.create({
      name: name.trim(),
      address: address.trim(),
      phone: phone?.trim() || null,
      wilaya_id: parseInt(wilaya_id),
      commune_id: parseInt(commune_id),
      is_private: false,
      created_by_doctor_id: null,
      latitude: latitude != null ? parseFloat(latitude) : null,
      longitude: longitude != null ? parseFloat(longitude) : null,
    });

    res.status(201).json({ message: "Clinique créée.", clinic });
  } catch (err) {
    console.error("adminClinics.create:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// ── PUT /api/admin/clinics/:id ────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const clinic = await Clinic.findByPk(req.params.id);
    if (!clinic)
      return res.status(404).json({ message: "Clinique introuvable." });

    const { name, address, phone, wilaya_id, commune_id, latitude, longitude } =
      req.body;
    if (name?.trim()) clinic.name = name.trim();
    if (address?.trim()) clinic.address = address.trim();
    if (wilaya_id) clinic.wilaya_id = parseInt(wilaya_id);
    if (commune_id) clinic.commune_id = parseInt(commune_id);
    clinic.phone = phone?.trim() || null;
    // Allow explicit null to clear coordinates
    if (latitude !== undefined)
      clinic.latitude = latitude != null ? parseFloat(latitude) : null;
    if (longitude !== undefined)
      clinic.longitude = longitude != null ? parseFloat(longitude) : null;

    await clinic.save();
    res.json({ message: "Clinique mise à jour.", clinic });
  } catch (err) {
    console.error("adminClinics.update:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// ── DELETE /api/admin/clinics/:id
exports.remove = async (req, res) => {
  try {
    const clinic = await Clinic.findByPk(req.params.id);
    if (!clinic)
      return res.status(404).json({ message: "Clinique introuvable." });

    const activeAppts = await Appointment.count({
      where: {
        clinic_id: clinic.id,
        status: { [Op.in]: ["pending", "confirmed"] },
      },
    });
    if (activeAppts > 0) {
      return res.status(400).json({
        message: `Impossible de supprimer : ${activeAppts} rendez-vous actif(s) dans cette clinique.`,
      });
    }

    await clinic.destroy();
    res.json({ message: "Clinique supprimée." });
  } catch (err) {
    console.error("adminClinics.remove:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};
