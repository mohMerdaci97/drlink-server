const { z } = require("zod");

const appointmentQuerySchema = z
  .object({
    doctor_id: z.coerce.number().int().positive().optional(),

    date: z.string().trim().optional(),

    status: z.string().trim().max(50).optional(),

    start_date: z.string().trim().optional(),

    end_date: z.string().trim().optional(),

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
  appointmentQuerySchema,
};
