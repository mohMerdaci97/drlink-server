const { z } = require("zod");

const patientListQuerySchema = z
  .object({
    search: z
      .string()
      .trim()
      .max(100, "La recherche est trop longue.")
      .optional(),

    page: z.coerce.number().int().positive().optional(),

    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

module.exports = {
  patientListQuerySchema,
};
