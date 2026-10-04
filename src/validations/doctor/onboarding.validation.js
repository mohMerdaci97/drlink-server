const { z } = require("zod");

const completeProfileSchema = z
  .object({
    description: z
      .string()
      .trim()
      .max(1000, "La description est trop longue.")
      .nullable()
      .optional(),

    specialty_id: z.coerce
      .number()
      .int()
      .positive("La spécialité est invalide."),
  })
  .strict();

module.exports = {
  completeProfileSchema,
};