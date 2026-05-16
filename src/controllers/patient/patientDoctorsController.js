const {
  Doctor,
  User,
  Specialty,
  Clinic,
  DoctorClinic,
  Appointment,
  Wilaya,
  Commune,
} = require("../../models");
const { Op } = require("sequelize");

// ── GET /patient/doctors ─────────────────────
exports.getDoctors = async (req, res) => {
  try {
    const lang =
      req.headers["accept-language"]?.split(",")[0]?.split("-")[0] || "ar";
    const { specialty_id, wilaya_id, search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const where = { is_approved: true };

    if (specialty_id) where.specialty_id = specialty_id;

    const userWhere = {};
    if (search) {
      userWhere.full_name = { [Op.like]: `%${search}%` };
    }

    const clinicWhere = {};
    if (wilaya_id) clinicWhere.wilaya_id = wilaya_id;

    const { count, rows } = await Doctor.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "full_name"],
          required: true,
        },
        {
          model: Specialty,
          attributes: ["id", "name"],
        },
        {
          model: Clinic,
          as: "Clinics",
          attributes: [
            "id",
            "name",
            "address",
            "latitude",
            "longitude",
            "wilaya_id",
          ],
          through: { attributes: [] },
          where: Object.keys(clinicWhere).length ? clinicWhere : undefined,
          required: !!wilaya_id,
          include: [
            {
              model: Wilaya,
              as: "wilaya",
              attributes: ["id", lang === "ar" ? "name_ar" : "name_fr"],
            },
          ],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
    });

    const doctors = rows.map((d) => {
      const clinic = d.Clinics?.[0];
      const wilaya = clinic?.wilaya;
      const wilayaName = lang === "ar" ? wilaya?.name_ar : wilaya?.name_fr;

      return {
        id: d.id,
        name: d.user?.full_name || d.User?.full_name || "Doctor",
        specialty_id: d.specialty_id,
        specialty: d.Specialty?.name,
        description: d.description,
        photo_url: d.photo_url,
        location: wilayaName ?? clinic?.name ?? null,
        wilaya_id: clinic?.wilaya_id ?? null,
        rating: 4.8,
        reviews: 0,
        available: true,
      };
    });

    return res.json({
      doctors,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit),
    });
  } catch (err) {
    console.error("getDoctors error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── GET /patient/doctors/:id ─────────────────
exports.getDoctorDetail = async (req, res) => {
  try {
    const lang =
      req.headers["accept-language"]?.split(",")[0]?.split("-")[0] || "ar";
    const { id } = req.params;

    const doctor = await Doctor.findOne({
      where: { id, is_approved: true },
      include: [
        { model: User, as: "user", attributes: ["full_name", "phone"] },
        { model: Specialty, attributes: ["id", "name"] },
        {
          model: Clinic,
          as: "Clinics",
          attributes: [
            "id",
            "name",
            "address",
            "phone",
            "latitude",
            "longitude",
          ],
          through: { attributes: ["day_of_week", "start_time", "end_time"] },
          include: [
            {
              model: Wilaya,
              as: "wilaya",
              attributes: ["id", lang === "ar" ? "name_ar" : "name_fr"],
            },
            {
              model: Commune,
              as: "commune",
              attributes: ["id", lang === "ar" ? "name_ar" : "name_fr"],
            },
          ],
        },
      ],
    });

    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const clinics = doctor.Clinics.map((c) => ({
      id: c.id,
      name: c.name,
      address: c.address,
      phone: c.phone,
      latitude: c.latitude,
      longitude: c.longitude,
      wilaya: lang === "ar" ? c.wilaya?.name_ar : c.wilaya?.name_fr,
      commune: lang === "ar" ? c.commune?.name_ar : c.commune?.name_fr,
      schedule: c.DoctorClinic
        ? {
            day_of_week: c.DoctorClinic.day_of_week,
            start_time: c.DoctorClinic.start_time,
            end_time: c.DoctorClinic.end_time,
          }
        : null,
    }));

    return res.json({
      id: doctor.id,
      name: doctor.user?.full_name,
      phone: doctor.user?.phone,
      specialty: doctor.Specialty?.name,
      specialty_id: doctor.specialty_id,
      description: doctor.description,
      photo_url: doctor.photo_url,
      rating: 4.8,
      reviews: 0,
      clinics,
    });
  } catch (err) {
    console.error("getDoctorDetail error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── GET /patient/doctors/:id/slots ───────────
exports.getAvailableSlots = async (req, res) => {
  try {
    const { id } = req.params;
    const { clinic_id, date } = req.query;

    if (!clinic_id || !date) {
      return res.status(400).json({ message: "clinic_id and date required" });
    }

    // day of week from date string
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
        doctor_id: id,
        clinic_id,
        day_of_week: dayOfWeek,
      },
    });

    if (!schedule) {
      return res.json({ slots: [], available: false, reason: "no_schedule" });
    }

    // generate all slots every 30 min between start and end
    const allSlots = _generateSlots(schedule.start_time, schedule.end_time, 30);

    // find already booked slots for this doctor + clinic + date
    const booked = await Appointment.findAll({
      where: {
        doctor_id: id,
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

    return res.json({
      date,
      day_of_week: dayOfWeek,
      clinic_id: parseInt(clinic_id),
      doctor_id: parseInt(id),
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      slots,
    });
  } catch (err) {
    console.error("getSlots error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /patient/doctors/specialties
exports.getSpecialties = async (req, res) => {
  try {
    const specialties = await Specialty.findAll({
      attributes: ["id", "name"],
      order: [["name", "ASC"]],
    });
    return res.json({ specialties });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

//  GET /patient/doctors/wilayas
exports.getWilayas = async (req, res) => {
  try {
    const lang =
      req.headers["accept-language"]?.split(",")[0]?.split("-")[0] || "ar";
    const wilayas = await Wilaya.findAll({
      attributes: ["id", "code", lang === "ar" ? "name_ar" : "name_fr"],
      order: [["id", "ASC"]],
    });
    return res.json({
      wilayas: wilayas.map((w) => ({
        id: w.id,
        code: w.code,
        name: lang === "ar" ? w.name_ar : w.name_fr,
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// helper: generate 30-min slots
function _generateSlots(startTime, endTime, intervalMinutes) {
  const slots = [];
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);

  let currentMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  while (currentMinutes < endMinutes) {
    const h = Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    currentMinutes += intervalMinutes;
  }

  return slots;
}

// ── GET /patient/doctors/nearby ──────────────
exports.getNearbyDoctors = async (req, res) => {
  try {
    const lang =
      req.headers["accept-language"]?.split(",")[0]?.split("-")[0] || "ar";
    const { lat, lng, radius = 5 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: "lat and lng required" });
    }

    const latF = parseFloat(lat);
    const lngF = parseFloat(lng);
    const radiusKm = parseFloat(radius);

    const { sequelize } = require("../../models");
    const { Op } = require("sequelize");

    // find clinics within radius
    const clinics = await Clinic.findAll({
      attributes: [
        "id",
        "name",
        "wilaya_id",
        "latitude",
        "longitude",
        [
          sequelize.literal(`
            6371 * acos(
              cos(radians(${latF})) *
              cos(radians(latitude)) *
              cos(radians(longitude) - radians(${lngF})) +
              sin(radians(${latF})) *
              sin(radians(latitude))
            )
          `),
          "distance_km",
        ],
      ],
      where: {
        latitude: { [Op.not]: null },
        longitude: { [Op.not]: null },
      },
      having: sequelize.literal(
        `6371 * acos(
          cos(radians(${latF})) *
          cos(radians(latitude)) *
          cos(radians(longitude) - radians(${lngF})) +
          sin(radians(${latF})) *
          sin(radians(latitude))
        ) <= ${radiusKm}`,
      ),
      order: sequelize.literal("distance_km ASC"),
      include: [
        {
          model: Wilaya,
          as: "wilaya",
          attributes: [lang === "ar" ? "name_ar" : "name_fr"],
          required: false,
        },
      ],
      limit: 30,
    });

    const clinicIds = clinics.map((c) => c.id);
    if (clinicIds.length === 0) {
      return res.json({ doctors: [] });
    }

    const doctors = await Doctor.findAll({
      where: { is_approved: true },
      include: [
        { model: User, as: "user", attributes: ["full_name"] },
        { model: Specialty, attributes: ["name"] },
        {
          model: Clinic,
          as: "Clinics",
          attributes: ["id", "name", "latitude", "longitude"],
          through: { attributes: [] },
          where: { id: { [Op.in]: clinicIds } },
          required: true,
          include: [
            {
              model: Wilaya,
              as: "wilaya",
              attributes: [lang === "ar" ? "name_ar" : "name_fr"],
              required: false,
            },
          ],
        },
      ],
      subQuery: false,
    });

    // map clinic distance back to doctor
    const clinicDistMap = {};
    clinics.forEach((c) => {
      clinicDistMap[c.id] = parseFloat(c.dataValues.distance_km || 0);
    });

    const result = doctors
      .map((d) => {
        const clinic = d.Clinics?.[0];
        const dist = clinic ? (clinicDistMap[clinic.id] ?? 0) : 0;
        const wilaya = clinic?.wilaya;
        return {
          id: d.id,
          name: d.user?.full_name,
          specialty: d.Specialty?.name,
          photo_url: d.photo_url,
          clinic_name: clinic?.name,
          wilaya: lang === "ar" ? wilaya?.name_ar : wilaya?.name_fr,
          lat: clinic?.latitude ? parseFloat(clinic.latitude) : null,
          lng: clinic?.longitude ? parseFloat(clinic.longitude) : null,
          distance_km: Math.round(dist * 10) / 10,
          rating: 4.8,
          available: true,
        };
      })
      .filter((d) => d.lat && d.lng);

    result.sort((a, b) => a.distance_km - b.distance_km);

    return res.json({ doctors: result });
  } catch (err) {
    console.error("getNearbyDoctors error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
