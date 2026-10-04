const { z } = require("zod");

const {
  paginationQuerySchema,
  searchQuerySchema,
} = require("../shared/common.validation");

const appointmentListQuerySchema = z
  .object({
    ...paginationQuerySchema.shape,
    ...searchQuerySchema.shape,

    status: z
      .enum(["pending", "confirmed", "completed", "cancelled"])
      .optional(),

    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "La date doit être au format YYYY-MM-DD.")
      .optional(),
  })
  .strict();

module.exports = {
  appointmentListQuerySchema,
};
