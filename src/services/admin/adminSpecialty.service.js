const path = require("path");
const fs = require("fs");

const specialtyRepository = require("../../repositories/admin/specialty.repository");
const { getPagingData } = require("../../helpers/pagination");

const getImagePath = (imageUrl) => {
  return path.join(__dirname, "../../", imageUrl);
};

const deleteImage = (imageUrl) => {
  if (!imageUrl) return;

  const filePath = getImagePath(imageUrl);

  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, () => {});
  }
};

exports.getAll = async ({ pagination }) => {
  const result = await specialtyRepository.findAll({
    pagination,
  });

  return getPagingData(result, pagination.page, pagination.limit);
};

exports.create = async ({ name, file }) => {
  if (!name?.trim()) {
    const error = new Error("Le nom est requis.");
    error.statusCode = 400;
    throw error;
  }

  const imageUrl = file ? `/uploads/specialties/${file.filename}` : null;

  return specialtyRepository.create({
    name: name.trim(),
    image_url: imageUrl,
  });
};

exports.update = async (id, { name, file }) => {
  const specialty = await specialtyRepository.findById(id);

  if (!specialty) {
    const error = new Error("Spécialité introuvable.");
    error.statusCode = 404;
    throw error;
  }

  const updateData = {};

  if (name?.trim()) {
    updateData.name = name.trim();
  }

  if (file) {
    const newImageUrl = `/uploads/specialties/${file.filename}`;

    if (specialty.image_url && specialty.image_url !== newImageUrl) {
      deleteImage(specialty.image_url);
    }

    updateData.image_url = newImageUrl;
  }

  return specialtyRepository.update(specialty, updateData);
};

exports.remove = async (id) => {
  const specialty = await specialtyRepository.findById(id);

  if (!specialty) {
    const error = new Error("Spécialité introuvable.");
    error.statusCode = 404;
    throw error;
  }

  if (specialty.image_url) {
    deleteImage(specialty.image_url);
  }

  await specialtyRepository.destroy(specialty);

  return {
    message: "Spécialité supprimée.",
  };
};
