const { z } = require("zod");

const {
  paginationQuerySchema,
  searchQuerySchema,
} = require("../shared/common.validation");

// Plans

const createPlanSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Le nom du plan doit contenir au moins 2 caractères.")
      .max(100, "Le nom du plan est trop long."),

    type: z.enum(["free", "monthly", "annual", "custom"], {
      errorMap: () => ({
        message: "Type de plan invalide.",
      }),
    }),

    price_dzd: z.coerce.number().min(0, "Le prix ne peut pas être négatif."),

    duration_days: z.coerce
      .number()
      .int()
      .min(0, "La durée ne peut pas être négative."),

    description: z
      .string()
      .trim()
      .max(1000, "La description est trop longue.")
      .nullable()
      .optional(),
  })
  .strict();

const updatePlanSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Le nom du plan doit contenir au moins 2 caractères.")
      .max(100, "Le nom du plan est trop long.")
      .optional(),

    type: z
      .enum(["free", "monthly", "annual", "custom"], {
        errorMap: () => ({
          message: "Type de plan invalide.",
        }),
      })
      .optional(),

    price_dzd: z.coerce
      .number()
      .min(0, "Le prix ne peut pas être négatif.")
      .optional(),

    duration_days: z.coerce
      .number()
      .int()
      .min(0, "La durée ne peut pas être négative.")
      .optional(),

    description: z
      .string()
      .trim()
      .max(1000, "La description est trop longue.")
      .nullable()
      .optional(),

    is_active: z.boolean().optional(),
  })
  .strict();

// Subscriptions

const subscriptionListQuerySchema = z
  .object({
    ...searchQuerySchema.shape,
    ...paginationQuerySchema.shape,

    status: z.enum(["active", "expired", "cancelled", "grace"]).optional(),
  })
  .strict();

const assignSubscriptionSchema = z
  .object({
    doctor_id: z.coerce.number().int().positive(),

    plan_id: z.coerce.number().int().positive(),

    starts_at: z.string().trim().optional(),

    amount_dzd: z.coerce.number().positive().nullable().optional(),

    paid_at: z.string().trim().nullable().optional(),

    payment_method: z.string().trim().max(50).optional(),

    reference: z.string().trim().max(255).nullable().optional(),

    notes: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

const renewSubscriptionSchema = z
  .object({
    amount_dzd: z.coerce.number().positive().nullable().optional(),

    paid_at: z.string().trim().nullable().optional(),

    payment_method: z.string().trim().max(50).optional(),

    reference: z.string().trim().max(255).nullable().optional(),

    notes: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

// Payments

const recordPaymentSchema = z
  .object({
    amount_dzd: z.coerce
      .number()
      .positive("Le montant doit être supérieur à zéro."),

    paid_at: z.string().trim(),

    payment_method: z.string().trim().max(50).optional(),

    reference: z.string().trim().max(255).nullable().optional(),

    notes: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

module.exports = {
  createPlanSchema,
  updatePlanSchema,
  subscriptionListQuerySchema,
  assignSubscriptionSchema,
  renewSubscriptionSchema,
  recordPaymentSchema,
};
