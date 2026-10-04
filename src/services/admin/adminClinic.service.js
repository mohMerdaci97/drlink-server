const clinicRepository = require("../../repositories/admin/clinic.repository");

exports.getAll = async ({ search, wilaya_id }) => {
  const clinics = await clinicRepository.findAllAdmin({
    search,
    wilaya_id,
  });

  return {
    data: clinics,
    total: clinics.length,
  };
};

exports.getOne = async (clinicId) => {
  const clinic = await clinicRepository.findAdminDetails(clinicId);

  if (!clinic) {
    const error = new Error("Clinique introuvable.");
    error.statusCode = 404;
    throw error;
  }

  return clinic;
};

exports.create = async (data) => {
  if (!data.name?.trim()) {
    const error = new Error("Nom requis.");
    error.statusCode = 400;
    throw error;
  }

  if (!data.address?.trim()) {
    const error = new Error("Adresse requise.");
    error.statusCode = 400;
    throw error;
  }

  if (!data.wilaya_id) {
    const error = new Error("Wilaya requise.");
    error.statusCode = 400;
    throw error;
  }

  if (!data.commune_id) {
    const error = new Error("Commune requise.");
    error.statusCode = 400;
    throw error;
  }

  return clinicRepository.createAdmin({
    name: data.name.trim(),
    address: data.address.trim(),
    phone: data.phone?.trim() || null,
    wilaya_id: Number(data.wilaya_id),
    commune_id: Number(data.commune_id),
    latitude:
      data.latitude != null
        ? Number(data.latitude)
        : null,
    longitude:
      data.longitude != null
        ? Number(data.longitude)
        : null,
  });
};

exports.update = async (clinicId, data) => {
  const clinic = await clinicRepository.findById(clinicId);

  if (!clinic) {
    const error = new Error("Clinique introuvable.");
    error.statusCode = 404;
    throw error;
  }

  const updates = {};

  if (data.name?.trim()) {
    updates.name = data.name.trim();
  }

  if (data.address?.trim()) {
    updates.address = data.address.trim();
  }

  if (data.wilaya_id) {
    updates.wilaya_id = Number(data.wilaya_id);
  }

  if (data.commune_id) {
    updates.commune_id = Number(data.commune_id);
  }

  if (data.phone !== undefined) {
    updates.phone = data.phone?.trim() || null;
  }

  if (data.latitude !== undefined) {
    updates.latitude =
      data.latitude != null
        ? Number(data.latitude)
        : null;
  }

  if (data.longitude !== undefined) {
    updates.longitude =
      data.longitude != null
        ? Number(data.longitude)
        : null;
  }

  return clinicRepository.update(clinic, updates);
};

exports.remove = async (clinicId) => {
  const clinic = await clinicRepository.findById(clinicId);

  if (!clinic) {
    const error = new Error("Clinique introuvable.");
    error.statusCode = 404;
    throw error;
  }

  const activeAppointments =
    await clinicRepository.countActiveAppointments(clinicId);

  if (activeAppointments > 0) {
    const error = new Error(
      `Impossible de supprimer : ${activeAppointments} rendez-vous actif(s) dans cette clinique.`
    );

    error.statusCode = 400;

    throw error;
  }

  await clinicRepository.remove(clinic);
};