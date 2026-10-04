const { z } = require("zod");

const auditLogQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional(),

    limit: z.coerce.number().int().min(1).max(100).optional(),

    action: z.string().trim().max(100, "Action trop longue.").optional(),

    role: z.enum(["admin", "doctor", "assistant", "patient"]).optional(),

    status: z.enum(["success", "failure"]).optional(),

    userId: z.coerce.number().int().positive().optional(),

    entityType: z
      .string()
      .trim()
      .max(50, "Type d'entité trop long.")
      .optional(),

    from: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "La date de début doit être au format YYYY-MM-DD.",
      )
      .optional(),

    to: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "La date de fin doit être au format YYYY-MM-DD.",
      )
      .optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (!data.from || !data.to) return true;
      return data.from <= data.to;
    },
    {
      message:
        "La date de début doit être antérieure ou égale à la date de fin.",
      path: ["to"],
    },
  );

const auditLogIdSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

module.exports = {
  auditLogQuerySchema,
  auditLogIdSchema,
};
