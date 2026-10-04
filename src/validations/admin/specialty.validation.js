const { z } = require("zod");

const specialtyNameSchema = z
  .string()
  .trim()
  .min(2, "Le nom de la spécialité doit contenir au moins 2 caractères.")
  .max(150, "Le nom de la spécialité est trop long.");

const createSpecialtySchema = z
  .object({
    name: specialtyNameSchema,
  })
  .strict();

const updateSpecialtySchema = z
  .object({
    name: specialtyNameSchema.optional(),
  })
  .strict();

module.exports = {
  createSpecialtySchema,
  updateSpecialtySchema,
};
